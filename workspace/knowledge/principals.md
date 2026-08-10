# Principals — who is acting

**In one sentence.** Every request carries a *principal* describing what kind of
actor it is — `human`, `service`, `system`, and soon `ai_worker` — as a field,
never as a parsed string.

**Why it matters.** This is the foundation of the product. An AI worker is a
third kind of actor, and the platform must be able to say what it is, what it may
do, and on whose behalf. Before this, the kind lived in a string prefix
(`api_key:<uuid>`) re-parsed at sixteen call sites — every one of which would
have needed a third branch.

Invariant **I2**: asymmetry between actor types belongs in **data**, not in
`if (type === …)` scattered through the codebase.

## How it works

```ts
type Principal = {
  id: string                       // the actor: a user id, an API key id
  kind: 'human' | 'ai_worker' | 'service' | 'system'
  onBehalfOfUserId: string | null  // the person a service acts for, if any
  displayName: string | null
  tenantId: string | null
  organizationId: string | null
}
```

Attached to `AuthContext` at the authentication boundary, **after** scope
resolution — a superadmin's tenant/organization cookies rewrite the effective
scope, and attaching first would leave the principal describing the old one.

`ai_worker` is declared but not yet produced. It exists so consumers switch over
a complete set now rather than being rewritten later. **That is the whole point
of the abstraction: the third kind must cost nothing to add.**

## How to do the common thing

```ts
import { effectiveUserId, isMachinePrincipal } from '@open-mercato/shared/lib/auth/principal'

effectiveUserId(auth)      // whose personal state this request reads/writes
isMachinePrincipal(auth)   // "not a person" — e.g. skip interactive session checks
requirePrincipal(auth)     // the principal, derived if the context predates the field
```

**Never** parse `auth.sub` or branch on `auth.isApiKey`. Both are deprecated and
only still exist because parked modules read them.

### `effectiveUserId` is not always what you want

It returns the owning user for a key issued on someone's behalf. That is right
for *personal state* — sidebar layout, preferences. It is wrong for
**authorship**: a machine does not author a record for a human.
`normalizeAuthorUserId` deliberately returns `null` for any machine principal,
even one with an owner.

Ask which question you are answering: *"whose settings are these?"* or *"who is
responsible for this?"*

## API keys — three identities in one row, and which one authorizes

An `api_keys` row carries three references to a person, and only one of them is
the actor. Confusing them was U3.

| Column | What it means | Does it authorize? |
|---|---|---|
| `session_user_id` | The key **acts as** this user. Set for session keys only | **Yes.** The key borrows a person's identity and must not outrange them |
| `created_by` | Who minted the key. Provenance | **Only to stop the key outranging its creator** — see below |
| `organization_id` | The key's own scope | **Yes.** This is the key's authority, and it is what `RbacService` reads |

### What actually decides what a key may do

`RbacService.loadAcl` parses the subject, sees a **service** principal, and reads
features from **the key's own roles**. The creator's user ACLs are never
consulted. A key does not inherit the permissions of the person who made it — the
escalation people reach for first does not exist here.

But note this line, because it is the one with teeth:

```ts
let organizations: string[] | null = key.organizationId ? [key.organizationId] : null
```

**A key with a null organization is unrestricted across the tenant.** Null is not
"unset" here; it is "everywhere".

### The comparison at authentication, and what it is for

The rule differs by which identity the key carries, because the two mean
different things:

```ts
const outrangesCreator = isSessionKey
  ? keyOrganizationId !== creatorOrganizationId          // identity: must match
  : keyOrganizationId === null && creatorOrganizationId !== null   // provenance: must not exceed
```

For a **session key**, equality. The key acts as that person, so anywhere it can
reach that they cannot is impersonation with extra privileges.

For a **regular key**, only *"may not be broader than its creator"*. A null
organization means **unrestricted across the tenant** to `RbacService`, so a key
with none, minted by somebody confined to one organization, is an amplification
(I4). Anything else — a key scoped to an organization its creator has since left
— is a service credential doing exactly what it was created for, and nobody
changing desks should revoke it.

Equality used to be the rule for both. That is what made a key's working life
depend on a person's current record: move them, and every key they ever created
returned 401 silently, forever.

### What happens when the person leaves

Two mechanisms, deliberately:

1. **`api_keys` subscribes to `auth.user.deleted` and revokes the keys that user
   created.** Offboarding becomes an explicit, visible, auditable act — the key
   list shows them revoked — rather than a fleet of credentials that mysteriously
   begin failing.
2. **Authentication still refuses a key whose user has gone.** Fail-closed
   backstop for whatever the cascade missed, because an event bus is not a place
   to put the last line of a security control.

### The rule when creating a key

**Take the organization from the creator's own record, never from the request
scope.** They must agree, because the authentication path compares them — and an
admin working tenant-wide has no selected scope, so deriving from the request
produces `null` against a creator who has one, and the key is dead on arrival.

If someone asks for a different organization explicitly, **refuse at creation**
with a message. A key that cannot work should fail while somebody is watching.

### The header trap

```bash
curl -H "X-Api-Key: <secret>" ...                 # works
curl -H "Authorization: ApiKey <secret>" ...      # works
curl -H "Authorization: Bearer <secret>" ...      # 401, always
```

`Bearer` is the reflex and this platform does not accept it for API keys. The
resulting 401 is indistinguishable from a scoping refusal, which is how U3 was
misdiagnosed twice — see [L30 and L32](../../LESSONS.md).

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `effectiveUserId` returns `null` unexpectedly | A service principal acting for nobody — correct, not a bug | Handle `null`; do **not** fall back to the key id, which writes personal rows nobody can read back |
| A prefixed `api_key:<uuid>` used where a user id belongs | Legacy parsing that survived | Use the helpers |
| A cached or trusted-envelope context has no principal | It never passed the boundary that attaches one | The helpers derive it — that is why they take the whole context |
| An API key returns 401 on every request, with correct roles | Its `organization_id` is null while its creator has one — it would outrange them | Give the key an organization; creation now does this automatically |
| Every key an offboarded user created stops working | Deliberate. They were revoked when the user was deleted | Reissue under somebody who is still here |

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/auth/principal.ts` | The type, the helpers, and the **only** code that knows the `api_key:` encoding |
| `packages/shared/src/lib/auth/server.ts` | `AuthContext`, `requirePrincipal`, where the principal is attached |
| `packages/core/src/modules/auth/services/rbacService.ts` | Grants resolved by principal kind |
| `packages/shared/src/lib/auth/server.ts` → `resolveApiKeyAuth` | The three-identity resolution and the organization comparison |
| `packages/core/src/modules/api_keys/api/keys/route.ts` | Where a new key's organization is decided |

Design intent: [`compai/planning/01-core-architecture.md`](../../compai/planning/01-core-architecture.md) §2.1.
