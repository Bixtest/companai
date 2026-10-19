# PLAN — `T-27`: `ensureTenantScope` fails open on the absence of an auth object

**Status: BUILT AND CLOSED 2026-10-19.** Slot 0 / `CC-92`. Opened by `PREVIEW-AUDIT-TRIAGE.md` §1.3
(`T-27`, source `08 §12 S-2/S-6`).

**Files changed:** `packages/shared/src/lib/commands/scope.ts` (isStrictTenantScopeEnforced ·
logUnscopedTenantAccess · the unscoped tenant path · the organisation line-128 branch) ·
`packages/shared/src/lib/commands/__tests__/scope.test.ts` (+6 tests).

---

## 1. What the audit claimed, and what is actually true

The audit's line is: *"`ensureOrganizationScope` and `ensureTenantScope` fail open — log-only, default off.
The deny direction is opt-in. `ensureTenantScope`'s `&& ctx.auth` means an `auth: null` context accepts even a
non-null target tenant. The `systemActor` flag exists and is never checked here."*

**Measured, the sentence is half right, and the wrong half matters.**

**Right:** `ensureTenantScope`'s deny branch is guarded by `ctx.auth &&`:

```ts
if (!currentTenant) {
  if (tenantId && ctx.auth && !isSuperAdmin) { … throw 403 }
  return                                   // ← an ABSENT auth object lands here
}
```

So *no auth object at all* is exempt, and there is **no logging on that path** — the call returns silently.

**Wrong, twice:**

1. **"log-only, default off" is the wrong description of the tenant helper.** `ensureOrganizationScope`
   was already hardened in #2441: the unscoped path calls `logUnscopedOrganizationAccess` and can be turned
   into a deny with `OM_ENFORCE_ORG_SCOPE_STRICT`. The tenant helper got none of that — which is the
   finding, stated the other way round: **one of the pair is observable and configurable, the other is
   silent and fixed open.**
2. **"`systemActor` is never checked here" is false.** `systemActor` does not appear in the function at all,
   and the test that looks like it checks this
   (`'denies authenticated tenant-less systemActor contexts unless they are superadmin (#3910)'`) builds a
   context where **`auth` exists with `tenantId: null`** — so the deny branch fires on `ctx.auth` being
   truthy, not on the flag. The flag is orthogonal; nothing about it is missing from this function.

**The actual defect, in one sentence:** the exemption is keyed on the **absence of the auth object**, so a
caller that forgot to wire auth is trusted more than a caller who wired an empty one — *"no context at all"
passes, "a context with no tenant" is refused* — and the pass is silent.

## 2. What is NOT wrong, and why this is not an emergency

**The HTTP path cannot reach it.** `apps/mercato/src/app/api/[...slug]/route.ts:157-162` refuses a request
with no authenticated session *before* any handler runs, and the default is safe
(`requireAuth !== false`), so a route that omits the flag is still protected. That is the same argument
`T-45` recorded — the gate holds A0 at the route, so the command-layer check is a second line, not the first.

**The scope-less branch is load-bearing, and a test says so by name.**
`ensureOrganizationScope`'s comment: *"Pattern C … switching it to deny would break payment,
scheduled-command, and other scope-less flows."* And `scope.test.ts` pins the tenant behaviour with
`'preserves legacy system contexts without an authenticated actor'` — **the fail-open is deliberate and
tested, not an oversight.** 415 `ensureTenantScope` call sites across 71 files ride on it.

So the correct fix is **not** "make absent auth a 403" — that would break the payment and scheduled-command
flows, and the audit's urgency would be manufactured. It is the shape #2441 already chose for the sibling
function.

## 3. The requirement

**R1 — the tenant helper gets the shape its sibling already has.** An unscoped access (no auth object, or an
auth object with no tenant, paired with a non-null target tenant) is **logged**, with the same
`buildScopeLogContext` payload and the same `NODE_ENV !== 'test'` guard the org path uses. Today it is
silent, and a silent pass is the part an operator cannot act on.

**R2 — the deny direction becomes reachable, by flag, defaulting off.**
`OM_ENFORCE_TENANT_SCOPE_STRICT` (default `false`), mirroring `OM_ENFORCE_ORG_SCOPE_STRICT`. An operator
hardens the deployment; nothing else changes.

**R3 — the asymmetry is named in the code, not left for the next reader to discover.** The comment says
plainly that the exemption is keyed on the **absence of the auth object**, that it is load-bearing, and
where the flag turns it into a deny.

**R4 — `ensureOrganizationScope` gets the same treatment where it is missing it.** Its line 128 branch
(`!scope.tenantId && organizationId && ctx.auth && !isSuperAdmin`) has the identical `&& ctx.auth`
asymmetry and is silent. Both helpers, one rule.

**R5 — the test that pins the legacy behaviour keeps passing, and gains a sibling.** The existing
`'preserves legacy system contexts…'` test stays exactly as it is — it is a true statement about intended
behaviour. New tests assert: the log fires (captured, not guessed) · strict mode refuses · a *present but
tenant-less* auth is still refused as before.

## 4. The run

**4/4 RED, every file restored checksum-verified** (`L187`: checksums first, restore **by copy**).

| # | Mutation | Result |
|---|---|---|
| M1 | remove the strict-mode `throw` from the tenant path | **RED** — 2 failed |
| M2 | default the strict flag to `true` | **RED** — 3 failed (the legacy allow above all) |
| M3 | drop the log call from the unscoped tenant path | **RED** — 4 failed |
| M4 | drop the log call from the organisation line-128 branch | **RED** — 1 failed |

**Runs:** the scope suite **26 tests** (20 pre-existing, all still passing + 6 new) · `tsc --noEmit` on
`packages/shared` exit **0** · full shared **210 suites / 2,608 tests, 0 failures**.

**★ One flake, measured rather than assumed.** The first full run reported 209/210 with one suite failing;
the second reported no failure at all. Running the suite named in the project record
(`dynamicLoader.tsconfig.test.ts`) alone gives **13/13 green**, and the full suite with the sandbox's delete
guard switched off (`CODEBUDDY_SAFE_DELETE_ENABLED=0`) gives **210/210, 2,608 green** — which is exactly
`CC-19`'s recorded mechanism (that suite clears a 59-file temp cache, and this harness refuses any bulk
delete above 50 in one turn). Nothing about my change touches it.

## 5. What this does not do

- **It does not close the hole by default.** The unscoped pass stays, because the payment and
  scheduled-command flows use it. The change makes it *observable* and *closable*, which is what #2441
  settled for the sibling.
- **It does not touch `T-07`** (the seven modules' commands invisible to the authority gate), which is the
  row that actually gates `CC-121`. This row is the second line of defence, and it is recorded as such.
- **It does not correct the audit's two wrong claims in place** — that correction belongs in
  `PREVIEW-AUDIT-TRIAGE.md` §1.5 with the other measured corrections (Rule 13).
