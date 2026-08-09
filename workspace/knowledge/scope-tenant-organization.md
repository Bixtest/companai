# Scope: tenant, organization, and the superadmin trap

**In one sentence.** Almost every record is scoped by tenant *and* organization,
but the most privileged actor has **no organization** — and code that derives
scope from the actor breaks precisely for them.

**Why it matters.** This one root cause produced **four separate bugs in a single
day**, three of them in code written that day. It is the most productive source
of defects found so far, and it will keep producing them until the pattern is
recognised on sight.

## How it works

Two levels, and they behave differently:

| | Meaning | Nullable? |
|---|---|---|
| `tenant_id` | The customer. The hard isolation boundary — **never** cross it | Rarely |
| `organization_id` | A unit within that customer | **Often**, and legitimately |

`organization_id` is null in two very different situations, which is the whole
problem:

1. **The record has no organization by design.** An API key declares
   `orm: { orgField: null }` — it belongs to the tenant, not to any one unit.
2. **The actor has no organization.** A **superadmin** operates across all of
   them, so `auth.orgId` is `null` and no organization cookie is set.

### The idiom that breaks

```ts
const organizationId = ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? null
```

Perfectly reasonable, and correct for an ordinary user. For a superadmin it
yields `null`, and whatever happens next inherits that.

### The four bugs it caused

| Where | What happened |
|---|---|
| Audit write | Entries scoped to the actor landed with no organization |
| Audit list | Filtered `organization_id = <caller's org>`, hiding every null-organization row from everyone |
| Currencies delete | `mapInput` derives `organizationId` from the actor → `undefined` → the command rejects it. **A superadmin cannot delete a currency** |
| Sidebar preferences | `effectiveUserId` had to be careful not to key personal state to an actor with no user |

The first two are fixed. The third is [U3/U4](../references/upstream-issues.md).

## How to do the common thing

### Scope a record you just wrote

Use the **record's** organization, not the actor's:

```ts
const identifiers = identifierResolver(entity, 'created')
const organizationId = identifiers.organizationId ?? scopeOrganizationId
```

The record knows where it belongs. The actor may not.

### Filter a list by organization

Admit null-organization rows, or tenant-scoped records vanish for everyone:

```ts
if (parsed.organizationId) {
  query = query.where((eb: any) =>
    eb.or([
      eb('table.organization_id', '=', parsed.organizationId),
      eb('table.organization_id', 'is', null),
    ]),
  )
}
```

**Tenant filtering still applies**, so this widens visibility *within* a tenant
and never across tenants. That distinction is the safety property — keep it.

### Declare a tenant-scoped entity

```ts
orm: { entity: ApiKey, orgField: null }
```

Then every downstream consumer must handle a null organization. Grep for what
reads that entity before adding this.

## What goes wrong

| Symptom | Cause | Check |
|---|---|---|
| Works for a normal user, fails for an admin | Scope derived from the actor; superadmin has none | `auth.orgId` at the failure point |
| Rows exist in psql but the API returns none | Equality filter on a nullable column | The `where` clause for `organization_id` |
| `expected string, received undefined` on `organizationId` | `mapInput` reads the actor's scope | Whether the caller can supply it instead |
| A record appears in the wrong unit | Scoped to the actor rather than the record | Use `identifierResolver` |

## The habit that prevents all of them

> **Ask what this code does when the actor has no organization** — because the
> most privileged user in the system is exactly that actor, and they are the one
> most likely to be doing something unusual when it breaks.

A sweep of every `selectedOrganizationId ?? auth?.orgId` site is on the backlog
for this reason.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/auth/server.ts` | `AuthContext`, `applySuperAdminScope` |
| `packages/shared/src/lib/crud/factory.ts` | `identifierResolver`, `defaultIdentifierResolver` |
| `packages/core/src/modules/audit_logs/services/actionLogService.ts` | The organization filter, with the null-admitting `or` |
| `packages/core/src/modules/directory/` | Tenants and organizations themselves |
