# PLAN — `CC-128`: the platform's ceiling over its tenants

**Status:** requirement written 2026-10-19. **No code yet** — standing rule.
**Decision it implements:** Option A, taken by the owner 2026-10-19 — the platform's admins live
**inside** the foundational tenant, and other tenants inherit, or are limited to, what it allows.
Option B (a platform identity above every tenant) is deferred as `CC-133` with the owner's own trigger.

---

## 1. The defect, measured

The row says *"the platform has no ceiling over its tenants"*. Measuring it found the claim is **right
about the outcome and wrong about one premise**, and the wrong premise changes the design.

### 1.1 What `Tenant` actually holds

`packages/core/src/modules/directory/data/entities.ts:5-26` — `id`, `name`, `is_active`, `created_at`,
`updated_at`, `deleted_at`, and a `OneToMany` to organizations. **No ceiling, no parent, no kind.** So
*"the platform admin sets the ceiling and tenants narrow it"* has nowhere to be stored. Confirmed.

### 1.2 The claim "no settings table exists" is TOO STRONG — one does, and it already has a platform row

`packages/core/src/modules/configs/data/entities.ts:4-38` — `module_configs` carries `module_id`,
`name`, `value_json`, and **both** a nullable `organization_id` **and** a nullable `tenant_id` (a
three-level store: platform → tenant → organization), with two partial unique indexes:

```sql
create unique index "module_configs_global_unique"  ... ("module_id","name")              where "tenant_id" is null
create unique index "module_configs_scoped_unique"  ... ("module_id","name","tenant_id")  where "tenant_id" is not null
```

**That is the platform/tenant split the ceiling needs, and it already exists** — with an organization
level on top, which the ceiling deliberately does **not** copy: a capability ceiling is per tenant, and
an organization-level ceiling is a different feature with a different author. What is missing is not a
place to put settings — it is a **ceiling concept**: `module_configs` holds JSON values keyed by
`(module, name)`, and nothing in it is a bounded set of capabilities that another set must be a subset
of. Recorded because the row's own words (*"no plan/feature/limit/settings table exists"*) would have
sent a builder looking for a table that is already there, and the honest correction is narrower: **no
ceiling model exists, and a settings table does.**

### 1.3 The tenant scope exists on the ACL row, and the read ignores it

`packages/core/src/modules/auth/data/entities.ts:373-395` — `UserAcl.tenant_id` is **`uuid NOT NULL`**,
with the comment *"Tenant scope is mandatory for ACL evaluation"*.

Then `rbacService.ts:247-275`:

```ts
private async isGlobalSuperAdmin(userId: string): Promise<boolean> {
  const userSuper = await em.findOne(UserAcl, { user: userId as any, isSuperAdmin: true })
```

**No tenant filter.** So a user who is superadmin in *one* tenant is a superadmin in *every* tenant.
And `loadAcl` (`:317-323`) returns before scope is consulted at all:

```ts
if (subject.kind === 'human') {
  if (await this.isGlobalSuperAdmin(userId)) {
    const result = { isSuperAdmin: true, features: ['*'], organizations: null }
```

`['*']` matches **every** capability (`featureMatch.ts:45-46`: `if (granted === '*') return true`).

**So the defect is precise: the data model is tenant-scoped and the read is not.** The column that would
bound a superadmin exists and is mandatory; the query that decides whether to grant `*` does not use it.
That is `CC-101`'s class — a control that cannot see what it guards — one layer down.

### 1.4 The word "ceiling" already means something else in this codebase

`authorityEnforcementService.ts` uses *ceiling* throughout for the **autonomy gate** (A0–A5) derived
from organization edges (`:80`, `:124-130`), and `CC-123` added a **second** ceiling: the invoker — the
person a machine acts for (`:297-300`). `directory/api/organization-edges/route.ts` says *"no ceiling
could be lowered without a psql prompt"* in that sense.

**`CC-128` adds a third, different thing.** Naming it `ceiling` alone would collide with two live
meanings. It is a **capability ceiling** — the set of capabilities a tenant may ever hold — and the
document and the table name must say *capability*.

### 1.5 The rule that decides the implementation, already written down

`packages/shared/src/lib/auth/featureMatch.ts:25-43` — the docblock headed **"Do NOT build a
feature-list intersection on top of this"** lists six reasons a permission set is not a list, and ends:

> **The intersection must be of answers, not of lists**: ask the authority resolver once per capability,
> with the person the actor acts for supplied as a ceiling.

That was written for `CC-123`. It applies verbatim here, and it settles the design: **the tenant
capability ceiling is a third input to the same resolution — never a filter applied to `acl.features`.**
A list intersection would deny a `['*']` holder everything, lose every `prefix.*` family, lose the bare
prefix, and drop `.own` — all six cases are live in this codebase.

### 1.6 There is no runtime capability registry

`acl.ts` files export `AclFeatureDeclaration[]` from
`@open-mercato/shared/lib/capabilities/registry`, but **nothing enumerates them at runtime** — no
`allFeatures`, no `knownFeatures`, no catalogue service. The only thing that knows all **160** is
`CC-132`'s build-time guard, which reads files.

**Consequence for the design:** a ceiling entry cannot be validated by a registry lookup at request
time. It must be validated at **write** time against the platform ceiling (which is itself data), and
the build-time guard is what keeps the platform ceiling honest against the catalogue.

---

## 2. The requirement

**R1 — The ceiling is data.** A tenant's maximum capability set is stored, not compiled. No tenant may
hold a capability outside its ceiling, and no code path may raise one.

**R2 — It binds superadmins.** `isSuperAdmin` currently short-circuits to `['*']`. The ceiling is applied
**after** that answer, so a tenant superadmin holds `* ∩ ceiling`, not `*`. This is the whole point: the
defect is that one tenant's superadmin is every tenant's superadmin.

**R3 — A tenant ceiling is a subset of the platform ceiling, and a superset is REFUSED.** Writing a
tenant ceiling that names a capability the platform ceiling does not is a `400`, not a silent narrowing.
A ceiling that quietly grants less than it says is a lie the operator cannot see.

**R4 — It is applied as a ceiling on the ANSWER, never as a list intersection.** Per §1.5. Concretely:
the resolver is asked once per required capability and the ceiling is one of its inputs, alongside the
autonomy gate and the invoker.

**R5 — Absent means "inherit", never "unlimited".** A tenant with no ceiling row inherits the platform
ceiling. A platform with no ceiling row means the **enabled surface** — which is already bounded by
`enabledModules` (`CC-132` measured 149 in this environment, 160 with every flag on). "No row" must
never mean "no limit", or the first tenant created after this ships is unbounded.

**R6 — The foundational tenant is identified explicitly.** A column, not "the oldest row" and not "the
one with a particular name". `CC-133` records that under A the foundation is special **by convention**,
and that this is A's weakness; an explicit marker is the smallest thing that stops it being a guess.

**R7 — A stale ceiling entry is inert, not a grant.** If a capability is later removed from the
catalogue, a ceiling row still naming it must match nothing. The dangerous direction is the opposite
one — a ceiling that fails to load must not fall open — and R5 covers it.

---

## 3. The design

### 3.1 The table

```sql
create table "tenant_capability_ceilings" (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid null,              -- null = the PLATFORM ceiling
  capability  text not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz null
);
```

**One row per capability, not a JSON array.** Reasons, in order of weight:

1. **The subset rule (R3) is a query, not a code loop.** With rows, "is this tenant ceiling inside the
   platform ceiling" is a `NOT EXISTS`; with a JSON blob it is a parse, a set difference and a guess
   about what an empty array means.
2. **It is greppable and diffable.** A capability that disappears from a ceiling is a visible deleted
   row, which is the audit trail the platform admin's act needs (§4.6 of the plan: *"a cross-tenant
   admin act that is recorded as such"*).
3. **`module_configs` stores JSON values, and that is why it cannot be the ceiling.** A bounded set is
   not a value.

**Two partial unique indexes, mirroring `module_configs`' split** (§1.2):

```sql
create unique index "tenant_capability_ceilings_platform_uq"
  on "tenant_capability_ceilings" ("capability")
  where "tenant_id" is null and "deleted_at" is null;
create unique index "tenant_capability_ceilings_tenant_uq"
  on "tenant_capability_ceilings" ("tenant_id", "capability")
  where "tenant_id" is not null and "deleted_at" is null;
```

`deleted_at is null` in both predicates — the `CC-102`/`CC-107` rule: a retired row must not block its
own slot. `ai_agent_types` chose the opposite (one plain unique covering every status, so a retired key
is never reusable); that is right for a **name** and wrong for a **capability**, which must be re-addable.

### 3.2 The foundational tenant

```sql
alter table "tenants" add column "is_foundational" boolean not null default false;
create unique index "tenants_one_foundational_uq" on "tenants" ("is_foundational") where "is_foundational";
```

One row can be true, and the database says so. Under Option A this is what makes *"the platform's
admins"* nameable at all — they are the superadmins of the row where this is true.

**Not** a `kind` enum and **not** a self-referencing parent: `CC-133` keeps B (a real platform layer
above every tenant) available, and A must be a **strict subset** of B's shape so B is additive. A
boolean on `tenants` is additive; a parent link is B's shape half-built, which is the version that
would make B harder.

### 3.3 The enforcement point

**One place: the resolver.** `decideFor(subject, feature, scope, options)` already takes the invoker
ceiling; the capability ceiling joins it as a third input.

Composition, stated once so it cannot drift:

```
effective = grant        (the ACL answer — may be '*' )
          ∩ ceiling      (this tenant's, else the platform's)     ← CC-128
          ∩ ¬floor       (the five a machine may never hold)       ← CC-125
```

All three are **ceilings among ceilings** — the answer is the minimum of everything that applies, which
is the product's stated property. The floor is `CC-125`'s build; this requirement must leave the shape
ready for it rather than growing a second path later.

**Where it must NOT be implemented:** inside `loadAcl`. That function returns a **list**, and a list is
exactly what §1.5 forbids intersecting. `loadAcl`'s `['*']` stays as it is — it is a true statement
about the *grant*; the ceiling is a statement about the *ceiling*, and they meet at the resolver.

### 3.4 Reading the ceiling on the hot path

The resolver runs on every authority decision. A row-per-capability table read per request is not
acceptable, so the ceiling is **resolved once per (tenant) and cached**, invalidated on write — the same
shape `loadAcl` already uses (`getCacheKey`, `setCache`, five-minute TTL) and the same shape the
organization-edge route uses (`deleteByTags` on change). **A ceiling that takes five minutes to lower
is not a ceiling**, so a write must invalidate rather than wait for the TTL; `CC-123`'s delegation note
makes the same argument about a revoke.

---

## 4. The proof plan

| # | Claim | Proof | Fails before? |
|---|---|---|---|
| 1 | A superadmin holding `*` is bounded by its tenant's ceiling | resolver test: `['*']` + ceiling `{a.b}` → `a.b` allowed, `c.d` refused | **yes** — `*` matches everything |
| 2 | A tenant ceiling naming a capability outside the platform ceiling is refused at write | route/service test → `400` | **yes** — nothing to write to |
| 3 | A tenant with no ceiling inherits the platform's | resolver test | **yes** |
| 4 | A tenant ceiling does **not** widen: a capability in the ceiling but not in the grant stays refused | resolver test | **yes** |
| 5 | A ceiling is not a list intersection — a `prefix.*` grant inside a ceiling still matches its family, and `.own` stays distinct | resolver test, one per §1.5 case that applies | **yes** |
| 6 | The foundational tenant is unique | **real Postgres**: two `is_foundational` rows refused by the partial unique index | **yes** |
| 7 | A retired capability row frees its slot; a stale capability matches nothing | real Postgres + resolver test | **yes** |
| 8 | A ceiling write invalidates the cache | test asserting `deleteByTags` called | **yes** |

**Mutations** — each reverted, the matching test must go red, files restored byte-identical:
(a) drop the ceiling from the resolver · (b) make the subset check a no-op · (c) drop the
`deleted_at is null` predicate · (d) make "no tenant row" mean "no limit" · (e) let `isSuperAdmin`
bypass the ceiling.

**(d) is the important one.** It is the mutation that turns a ceiling into a decoration, and it is the
one a future reader would be most tempted to introduce "for compatibility".

**The migration gets a real-Postgres probe**, committed beside it with its run command, per `CC-102`
and `CC-107`: the table, both partial uniques, the one-foundational index, `down()` and `up()` again.

---

## 5. What this does not do

- **It does not build Option B.** `CC-133`, deferred by the owner's trigger. A must stay a strict
  subset so B is additive.
- **It does not build the floor.** `CC-125` — the five capabilities a machine may never hold, answered
  2026-10-19. This requirement shapes the resolver to accept it; it does not add it.
- **It does not fix `isGlobalSuperAdmin`'s missing tenant filter.** That read is the *defect's*
  mechanism, and R2 bounds its consequence; changing the read itself is a behaviour change to
  `loadAcl` that needs its own decision, because some callers may rely on the global reading today.
  **Named as a debt** rather than smuggled in.
- **It does not add a UI.** A ceiling with no screen is API-only, which is honest but incomplete; the
  screen is separate work.
- **It does not decide what a tenant's ceiling *should* be.** That is a product judgement per tenant.

---

## 6. Named debts this creates

1. **`isGlobalSuperAdmin` still has no tenant filter** (§5). Under R2 the consequence is bounded; the
   read is still wrong.
2. **`CC-119` carries this migration.** It is a schema move, so it joins the set the rebuild milestone
   takes to a project-shaped database — including `ai_agent_types`, which is already queued there.
3. **A ceiling write is a cross-tenant act when the author is the foundation's admin.** §4.6 of the
   one-agent plan says it must be *"recorded as such rather than inferred from a badge"*. This
   requirement builds the store; the recording is the audit half and needs its own row if the existing
   ledger cannot express "an act above a tenant".

---

## 7. Progress

| # | Item | State |
|---|---|---|
| 1 | The row's premise re-measured — one premise was too strong (§1.2) | ✅ **DONE** |
| 2 | The defect located precisely: tenant-scoped column, unscoped read (§1.3) | ✅ **DONE** |
| 3 | The naming collision found before it was written into a table (§1.4) | ✅ **DONE** |
| 4 | The requirement (R1–R7) | ✅ **DONE** |
| 5 | The design: table, foundational marker, enforcement point, cache (§3) | ✅ **DONE** |
| 6 | The migration + a real-Postgres probe | ✅ **DONE** — §8 |
| 7 | The resolver input and the cache | ✅ **DONE** — §8 |
| 8 | The write path (subset check, refusal, invalidation) | ✅ **DONE** — §8, as a CLI |

---

## 8. The build record

Two migrations, both proven on a real PostgreSQL 16:

- `directory/migrations/Migration20261019070000_directory.ts` — `tenants.is_foundational` (`boolean not
  null default false`) plus `tenants_one_foundational_uq`, a **partial unique index over
  `("is_foundational") where "is_foundational"`**, so a second `true` is a `23505` and not a service's
  memory.
- `auth/migrations/Migration20261019071000.ts` — `tenant_capability_ceilings` with two partial uniques
  (platform scope `tenant_id is null`, tenant scope `tenant_id is not null`), both excluding retired
  rows, and one read index.

**The probe is committed beside them** (`auth/migrations/__probes__/tenant-capability-ceiling.probe.sql`)
with its run command, and it extracts each migration's **own** SQL at runtime rather than a hand-copy.
Cases A–F: the pre-migration shape; both `up()`s; at most one foundational tenant (and any number of
`false` rows); the two ceiling uniques; a retired row freeing its slot; **the subset rule as one
`NOT EXISTS`**; and `down()`/`up()` again. All green, container removed.

### 8.1 The enforcement point, and why it is `holdsCapability`

The ceiling is **not** an autonomy gate. The other ceilings answer *how careful must we be*; this one
answers *may this be held at all* — and a capability outside it is not "needs approval", it is
unavailable. `resolveDecision` already has exactly that answer: `holdsCapability: false` → `A0`,
`bindingRule: 'grant'`. So `decideFor` now computes the ceiling refusal and passes
`holdsCapability: ceilingRefusal === null`.

**One addition to the shared type was needed.** Both causes — "the ACL does not grant it" and "the
tenant may never hold it" — arrive as `holdsCapability: false`, so the stock message would have said
*"The actor does not hold X"* and sent an operator to the grant. `ResolveInput.actor` gained an optional
`holdsCapabilityRefusal`, and the grant rule prefers it. Additive: absent means the old behaviour, and
no existing test pinned that string.

**Batch-shaped, not per-capability.** `refusalFor` asks the resolver once per required capability, so a
per-capability reader would read the ceiling N times per request. The reader interface is
`refusalsFor(tenantId, capabilities) → Map`, and `refusalFor` loads once and passes the map down.

**`null` reader = no ceiling store wired**, which is the pre-`CC-128` behaviour and what every existing
test constructs. Production wires it in `auth/di.ts`. That default is the fail-open shape, so it is
named in the interface's docblock rather than left to be discovered.

### 8.2 The design decision the build forced: an empty ceiling is not expressible

`loadCapabilityCeiling` inherits the platform ceiling when a tenant has **no rows**. But an empty set of
rows and "no rows" are indistinguishable, so a tenant that deliberately allowed nothing would silently
inherit everything.

**Resolved by refusing the empty write**, in both scopes, with a message that points at
`tenants.is_active` for a tenant and at the inheritance rule for the platform. The alternative — a
marker row meaning "I really mean empty" — is a second encoding of one fact, which is the thing this
codebase's own rules forbid. Recorded here because it is a real product decision, not an implementation
detail.

### 8.3 The write path is a CLI, and that is deliberate

`mercato auth ceiling [--tenant <id>] [--set a.b,c.d]` — read, or replace. **It is the ceiling's only
caller**, and without one the table would be `CC-101`'s class: a control nothing calls. A route and a
screen are separate work (§5).

### 8.4 Proof

| Proof | Result |
|---|---|
| `capabilityCeiling.test.ts` | **15/15** |
| `authorityEnforcement.capabilityCeiling.test.ts` | **7/7** |
| the whole `auth` module | **100 suites / 881 tests**, no suite failed to load |
| `tsc -p packages/core` | **0** |
| **the probe**, real PostgreSQL 16 | A–F all green; container removed |
| **five mutations**, each reverted and files restored byte-identical | **all 5 RED** |

The five mutations, and the test each one kills:

| # | Mutation | Killed by |
|---|---|---|
| M1 | `holdsCapability: true` — the ceiling ignored in the resolver | 3 tests, including *"refuses a capability the tenant may never hold"* |
| M2 | the subset check removed | *"refuses a SUPERSET of the platform ceiling"* |
| M3 | `deleted_at is null` dropped from the read | *"a retired row is not part of the ceiling"* |
| M4 | **inheriting tenants unbounded** (only tenant ceilings enforced) | *"names the platform when the tenant inherited"* |
| M5 | the empty-write guard removed | both empty-ceiling tests |

**M4 is the important one.** It is the mutation that turns a ceiling into a decoration, and it is the one
a future reader would be most tempted to introduce "for compatibility".

### 8.5 What is still not done, and it is named

- **No route and no screen.** A ceiling can be read and replaced from the CLI only.
- **`isGlobalSuperAdmin` still has no tenant filter** (§5). R2 bounds its consequence; the read is wrong.
- **The cache is only as good as the deployment.** `loadCapabilityCeiling` caches under
  `auth:capability-ceiling` and a write invalidates by tag, but if no `CacheStrategy` is registered the
  read falls through to the table every time — correct, just slower. Recorded so a performance
  investigation starts here rather than at the resolver.
- **No `CC-119`.** Both migrations join the set the database rebuild milestone carries, including
  `ai_agent_types`, which is already queued there.
