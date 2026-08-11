# Lending authority

**In one sentence.** One principal can hand another a capability for a fixed
window, with a reason recorded, and take it back at any moment.

**Why it matters.** Before this the platform had only permanent grants. Covering
somebody's approvals for a fortnight meant granting a role and remembering to
remove it — and the grant nobody remembers to remove is how permissions
accumulate until nobody can say why anyone has what they have.

---

## What a delegation is

| Field | Why it is like that |
|---|---|
| **grantee / grantor** | **Principals, not users.** An AI worker can hold one and grant one; `api_key:<id>` is a valid principal id, which is why the columns are `text` |
| **capability** | One capability per delegation. Lending three means three rows, and each can be revoked separately |
| **window** | `starts_at` and `expires_at`, both required. **Ninety days maximum** |
| **reason** | **Required.** A delegation nobody explained cannot be evaluated by whoever finds it later |
| **organization** | Optional. `null` covers the tenant; naming one covers only that one |
| **ceiling** | Optional. Lets a grantor lend *less* than they hold |

## Using it

```bash
# Lend approval authority for a fortnight
curl -X POST /api/auth/authority/delegations -H 'content-type: application/json' -d '{
  "action": "grant",
  "granteePrincipalId": "<user or key id>",
  "granteeKind": "human",
  "capabilityId": "auth.authority.approve",
  "startsAt": "2026-08-03T00:00:00Z",
  "expiresAt": "2026-08-17T00:00:00Z",
  "reason": "covering while Priya is away"
}'

# Take it back, effective on the next request
curl -X POST /api/auth/authority/delegations -d '{"action":"revoke","id":"<uuid>"}'
```

Guarded by **`auth.delegations.manage`**, which is **not itself delegable**:
somebody who can delegate the power to delegate has created a chain nobody can see
the end of.

**The grantor is always the caller.** There is no grantor field in the request —
accepting one would let anybody lend authority they do not hold by naming somebody
who does.

**There is no page yet** — `PROGRESS.md` item 16.

## How it reaches a decision

A delegation does **two** things, at two different layers, and both are needed:

1. **It grants** — in `RbacService.decideAllFeatures`, alongside role and user
   ACLs. Without this the route guard would refuse before the resolver ever ran,
   and the delegation could only ever *reduce* authority somebody already had.
2. **It caps** — as `delegationCeiling` in the resolver. The grantor is resolved
   as themselves and their gate becomes the ceiling, so a delegation can never
   lend more than the grantor holds (invariant **I4** in a different costume).

**Acting under a delegation also puts the actor under the effect-class matrix**,
which otherwise bounds machines only. Borrowed authority is treated like a
machine's, deliberately.

## Three rules that are decisions, not mechanics

**Delegations are never cached.** `RbacService` caches resolved ACLs for five
minutes; a delegation cannot live there, because a revoke that takes effect
"within five minutes" is not a revoke. They are a live query — and the cost is
bounded by *where* it is asked: only after the ordinary ACL has already said no,
which is the request that was about to return 403 anyway. A permission somebody
genuinely holds never pays for it.

**The latest expiry wins** when several apply. Newest-created would let a hastily
added short delegation silently shorten a carefully agreed long one;
most-permissive would make the answer depend on a ceiling rather than on the grant.

**A stored ceiling is never used on its own.** It would go stale the moment the
grantor's own authority changed, and a delegation quietly outliving its grantor's
permissions is the exact failure this feature prevents.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| The delegation grants nothing | The grantee id is the *subject string* (`api_key:abc`) rather than the principal id (`abc`) | Grant against the principal id |
| It grants nothing, and the id is right | The window has not started, or has passed. Expiry is **exclusive** | Check `starts_at` / `expires_at` |
| It grants one capability but the act still fails | The act needed several, and **every** one needs its own delegation | Grant the rest |
| It grants, but the act is still refused | The resolver narrowed it afterwards — a delegation gets you past the grant, not past everything | Read the refusal's binding rule |
| A 90-day limit rejected the grant | Deliberate | Re-grant when it lapses; that is the feature |

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/delegations.ts` | The rules, as pure functions shared by both call sites |
| `packages/core/src/modules/auth/services/delegationService.ts` | Reading and writing them |
| `packages/core/src/modules/auth/services/rbacService.ts` | `grantedByDelegation` — the grant half |
| `packages/core/src/modules/auth/services/authorityEnforcementService.ts` | `delegationCeilingFor` — the cap half |
| `packages/core/src/modules/auth/api/authority/delegations/route.ts` | The API |
