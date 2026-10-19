# PLAN — `CC-139`: the ceiling gets a screen

**Status: BUILT AND CLOSED 2026-10-19.** Opened by `CC-135`'s own close, in the same change, so that a
remaining half is *scheduled* rather than remembered — `CC-138`'s lesson.

**Files added:** `packages/core/src/modules/auth/api/capability-ceiling/catalogue/route.ts` ·
`packages/core/src/modules/auth/backend/settings/capability-ceiling/page.meta.ts` ·
`packages/core/src/modules/auth/backend/settings/capability-ceiling/page.tsx` ·
`api/capability-ceiling/__tests__/catalogue.route.test.ts` ·
`backend/settings/capability-ceiling/__tests__/capability-ceiling.page.test.tsx`.
**One debt opened:** `CC-140` (the write has no concurrency token — §6 below).

---

## 1. What is missing, measured

The platform can **enforce** a ceiling on what any tenant may ever be granted (`CC-128`), and since
`CC-135` it can be **changed** over HTTP:

| Piece | Where | State |
|---|---|---|
| the platform ceiling, read and written | `GET`/`PUT /api/auth/capability-ceiling` | ✅ built |
| a tenant's ceiling | `GET`/`PUT /api/auth/capability-ceiling/tenant/:id` | ✅ built |
| who may move it | `directory.tenants.manage` **and** the reach rule | ✅ built |
| the actor recorded | `derivePrincipal(auth)` | ✅ built |
| **a page** | — | **missing** |

So the one control that bounds every tenant in the deployment is the one control nobody can see. It is
changed by `mercato auth ceiling` or by hand-written HTTP. `PLAN-CC-135-ceiling-route.md` §4 recorded the
omission deliberately: a picker is a product surface, not transport.

**The tree already exists.** `components/AclEditor.tsx` (~570 lines) renders the enabled features grouped
by module for the role editor. The row says to reuse it. **Measured, and the row is right about the tree
and wrong about the component:** `AclEditor` is not a picker — it is a role editor that also fetches
roles, organisations and a target ACL, and writes to `/api/auth/{users,roles}/acl`. What is reusable is
the **shape of the data** it renders (`{ items: {id,title,module}[], modules: {id,title}[] }` from
`/api/auth/features`) and the grouping. So this row builds the picker over the same data rather than
mounting the role editor with a different action.

## 2. ★ The one design question the row does not answer: which door reads the catalogue

`/api/auth/features` — the endpoint that supplies the tree — is gated by **`auth.acl.manage`**
(`api/features.ts:12`). The ceiling screen is gated by **`directory.tenants.manage`**. They are not the
same capability, and the dispatcher's `requireFeatures` is **all-of**, with no any-of form (measured: no
`requireAnyFeature` exists anywhere in `packages/shared` or `packages/core`).

In practice a platform administrator holds both, through `*`. **But `CC-134`'s whole lesson is that the
wildcard must not be assumed to arrive by accident** — and `CC-135` deliberately supports a tenant
administrator narrowing **their own** ceiling, who may hold `directory.tenants.manage` and nothing else.
For that administrator the screen would render an empty tree and no explanation.

**The ruling: a read-only catalogue endpoint in the same folder, gated by `directory.tenants.manage`.**
`GET /api/auth/capability-ceiling/catalogue` returns exactly the shape `/api/auth/features` returns, from
the same source (`getModules()`).

**Why this is not a widening, stated plainly:** the capability that lets you **set** the ceiling is
strictly more powerful than the capability that lets you **see the list** you are setting it from. A
route that refuses to show the list to somebody who may rewrite the list is a door with the handle on the
wrong side. It is a separate route rather than a relaxed gate on `/api/auth/features` because that
endpoint also appends **tenant-scoped synthesized entity features** (`synthesizeRestrictedEntityFeatures`)
— data the platform ceiling must not contain, because the platform ceiling is above every tenant.

## 3. The requirement

**R1 — the page declares its capability.** `backend/settings/capability-ceiling/page.meta.ts` with
`requireFeatures: ['directory.tenants.manage']`, `pageContext: 'settings'`. An undeclared page is an
ungated page, which is `CC-138`'s class one surface over.

**R2 — the screen shows both scopes and never confuses them.** A scope selector — *Platform* plus one
entry per tenant — and the selected scope is visible in the heading. A tenant with no ceiling of its own
says **"inherits the platform ceiling"** (the read returns `source: 'platform'`), because *inheriting* and
*being identical to* are different facts and only one of them is editable here.

**R3 — the tree is grouped by module, searchable, and selectable by module.** Reuse the grouping and the
label formatting the role editor already uses. A ceiling of ~157 capabilities is not a flat list.

**R4 — saving writes through the route, never the service.** `PUT` to the scope's URL with
`{ capabilities }`. The route is what records **who** changed the ceiling; calling the library directly
would produce a change with no actor, which is the defect `CC-135` existed to fix.

**R5 — the refusals are sentences, not status codes.** The library refuses an **empty** ceiling (it is
indistinguishable from *no ceiling*, and no ceiling means *inherit*), and it refuses a tenant ceiling that
is not a **subset** of the platform's. Both arrive as a 400 with a message; the screen must show that
message, because an operator who reads *"400"* will try again.

**R6 — nothing is written without a change.** Save is disabled until the selection differs from what was
loaded, and Reset restores the loaded set. A screen that can silently rewrite a security control on a
stray click is worse than no screen.

## 4. The proof

1. The page metadata declares `directory.tenants.manage` and `pageContext: 'settings'` — asserted on the
   exported object, because that is the gate.
2. The catalogue route declares the same capability as the ceiling route, and returns the
   `{ items, modules }` shape the picker consumes.
3. Rendering the page with a stubbed fetch shows every module that has features, and the count of ticked
   capabilities equals the ceiling's.
4. Saving `PUT`s `{ capabilities }` to `/api/auth/capability-ceiling` for the platform scope and to
   `/api/auth/capability-ceiling/tenant/<id>` for a tenant scope — asserted on the URL, not the call count.
5. A 400 from the route is rendered as text (the empty-ceiling refusal).
6. A tenant whose `source` is `platform` renders the *inherits* sentence, and its checkboxes are the
   inherited set.

**Mutations, each RED then restored byte-identical** (checksum first — `L187`; restore by copy):

| # | Mutation | What must go red |
|---|---|---|
| M1 | drop `requireFeatures` from `page.meta.ts` | (1) |
| M2 | point the save at the platform URL regardless of scope | (4) |
| M3 | render the raw status instead of the route's message | (5) |
| M4 | gate the catalogue route on `auth.acl.manage` | (2) |
| M5 | treat `source: 'platform'` as "this tenant has its own ceiling" | (6) |

## 5. The run

**5/5 RED, every file restored checksum-verified** (`L187`: checksums first, restore **by copy**).

| # | Mutation | Result |
|---|---|---|
| M1 | drop `requireFeatures` from `page.meta.ts` | **RED** — 1 failed: the metadata test |
| M2 | point the save at the platform URL for every scope | **RED** — 1 failed: the tenant-URL test |
| M3 | render the status instead of the route's message | **RED** — 1 failed: the alert-text test |
| M4 | re-gate the catalogue route on `auth.acl.manage` | **RED** — 1 failed: the catalogue gate test |
| M5 | treat `source: 'platform'` as *this tenant has its own* | **RED** — 1 failed: the inherits test |

**Runs:** the three ceiling suites **26 tests** (14 route + 6 catalogue + 6 page) · `tsc --noEmit` on
`packages/core` exit **0** · full core **661 suites / 5,818 tests**.

**★ The build found a guard in the tree and had to answer it.** `packages/core/src/__tests__/optimistic-lock-ui-coverage.test.ts`
— and its workspace twin — scan every backend/component `.tsx` for a mutating call that does not send the
expected-version header, and its allowlist is **deliberately empty**: *"do NOT re-add entries to the
allowlist — wire it or exempt it inline."* The screen's `PUT` complies with neither, so both suites went
red (2 failures out of 5,818). **The answer is not a header**, because the ceiling is a **set of rows**
(`tenant_capability_ceilings`, one per capability) and there is no single `updatedAt` a version could name.
So the page carries an inline `optimistic-lock-exempt` reason, and the hole the reason exposes is now
**`CC-140`** rather than an empty comment.

## 6. What this does not do

- **It does not give the write a concurrency token** — **`CC-140`, opened by this build.** Two
  administrators who load the same ceiling and both save keep the last write, and the first one's change
  vanishes with no message. The read returns `capabilities`; a fingerprint (a hash of the sorted set)
  returned by the read and required by the write would make the second save a refusal rather than a
  silent overwrite. It is cheap, and it is not this row's — the screen is this row's, and the token
  belongs with the library that owns the write.
- **It does not add a tenant-facing screen.** The scope selector reaches a tenant's ceiling for an
  administrator who may narrow it (`CC-135` §3.2), but the page is a settings surface for administrators
  of the foundation.
- **It does not touch `CC-138`** — no route declares human-only/machine-only yet, and this page is one
  more surface that will need the declaration when that lands.
- **The picker does not render `dependsOn`.** The catalogue carries it (the ACL editor's dependency panel
  works from the same field), but the ceiling screen does not show it yet. A capability whose dependency is
  outside the ceiling will be silently inert there — recorded rather than hidden.
