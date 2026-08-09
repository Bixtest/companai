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

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `effectiveUserId` returns `null` unexpectedly | A service principal acting for nobody — correct, not a bug | Handle `null`; do **not** fall back to the key id, which writes personal rows nobody can read back |
| A prefixed `api_key:<uuid>` used where a user id belongs | Legacy parsing that survived | Use the helpers |
| A cached or trusted-envelope context has no principal | It never passed the boundary that attaches one | The helpers derive it — that is why they take the whole context |

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/auth/principal.ts` | The type, the helpers, and the **only** code that knows the `api_key:` encoding |
| `packages/shared/src/lib/auth/server.ts` | `AuthContext`, `requirePrincipal`, where the principal is attached |
| `packages/core/src/modules/auth/services/rbacService.ts` | Grants resolved by principal kind |

Design intent: [`compai/planning/01-core-architecture.md`](../../compai/planning/01-core-architecture.md) §2.1.
