# Denials — taking one permission away from one person

**In one sentence.** A denial removes a single permission from a single person,
without touching their role or anybody else's.

## The problem it closes

Permissions arrive through roles. So when one person should stop doing one
thing, an administrator had two options and both were bad:

- **Remove their role.** This takes away the nine other things they still need.
- **Invent a bespoke role for them.** This is how an organisation ends up with
  forty roles, none of which anybody can describe.

Neither is a control. The first is collateral damage; the second is a mess that
compounds. Platform 1 could do this and we could not, which is why it was the
last item of G1.

## The shape

| | |
|---|---|
| Table | `authority_denials` |
| Pure rules | [`packages/shared/src/modules/denials.ts`](../starting-kit/packages/shared/src/modules/denials.ts) |
| Service | `packages/core/src/modules/auth/services/denialService.ts` |
| Enforced in | `RbacService.userHasAllFeatures` |
| API | `POST /api/auth/authority/denials` — `withhold` and `lift` |
| CLI | `mercato auth denials --tenant <id> [--lift <denial-id>]` |
| Capability | `auth.denials.manage` (E5, not delegable) |

A denial names a **principal**, not a user — so an AI worker can be denied. The
column is `text` for the same reason delegations' is: an API key acting is
`api_key:<id>`, and a `uuid` column would make machine actors undeniable, which
is exactly the asymmetry invariant **I2** exists to prevent.

## The four decisions worth knowing

### 1. It can only ever subtract

Denials are consulted **after** the ordinary permission check has already
returned `true`. That ordering is the guarantee, not an optimisation: there is
no arrangement of denial rows that permits an act the ACL refused. The worst a
bug in the denial path can do is refuse something that should have been allowed.

A test in `rbacService.denial.test.ts` asserts the denial service is *not even
called* when the ACL said no. If somebody moves the call earlier, that test
fails.

### 2. It applies to superadmins

`decideAllFeatures` short-circuits to `true` for a superadmin. The denial check
runs afterwards anyway, on purpose.

A control the most powerful account ignores is not a control, it is a
suggestion. The cost of this decision is that it is possible to withhold `auth.*`
from the only account that could give it back — so the recovery path is the CLI,
out of band by design. Recovering from a lockout should require reaching the
server, not merely persistence in a browser.

### 3. Permanent is allowed, unlike a delegation

`expires_at` is nullable here and `not null` on `authority_delegations`. Read
side by side, the difference is the whole philosophy:

- A **grant** with no end is a role grant wearing a costume. Forbidden.
- A **subtraction** with no end is a standing decision. *"This person does not
  approve payments"* should not silently lapse after ninety days and hand the
  permission back to somebody nobody re-authorised.

### 4. The reason is mandatory

Enforced three times: in the Zod schema, in `denialProblem`, and by a database
check constraint. A permission that vanished with no reason cannot be safely
restored six months later by somebody who was not there — that is not
paperwork, it is the difference between a control and a mystery.

## Wildcards

`featurePattern` accepts `sales.*` and a bare `*`, and **only at the end** —
`sales.*.refund` is rejected rather than silently matching nothing.

Matching lives in `denialCoversFeature`, deliberately *not* `matchFeature` with
its arguments swapped. That helper answers "does this grant satisfy this
requirement", and its safe direction is the opposite of this one: when in doubt
a grant should not match and a denial should. Keeping them separate means a
future change to grant matching cannot silently change what a denial reaches.

## Never cached

`RbacService` caches resolved ACLs for five minutes. A denial cannot live in
that cache, because a denial that takes five minutes to arrive keeps
*permitting* — the unsafe direction. So it is a live query on every allowed
permission check.

That is a real cost, and honestly a larger one than delegations pay: delegations
are consulted only after the ACL said no (the path that was about to 403
anyway), whereas denials run on the path that was about to say **yes**. The
partial index `where lifted_at is null`, keyed on `(tenant_id,
subject_principal_id)`, makes the overwhelmingly common answer — nothing
withheld — an empty index scan.

## What does not exist yet

**No create form.** Withholding a permission is still an API call — see *Where
to see it* below for what the screen does and does not do. Of the five
governance screens, only record locks remains unbuilt, and it belongs on each
record's own page rather than on a list of its own.

Related: [`delegations.md`](delegations.md) — the mirror image, and worth reading
next to this one. [`authority-overview.md`](authority-overview.md) — where this
sits in the whole governance layer.

## Where to see it

`/backend/authority/denials`, gated on `auth.denials.manage`. Seeing a denial
and lifting it are the same capability on purpose: a role that could watch
somebody be locked out without being able to help is not a useful role, and the
reason text is not neutral information about a colleague.

Lifted and expired denials stay listed, for the same reason as delegations.

The page states the lockout escape route in plain text, because a denial
applies to superadmins too -- it is possible to withhold something from the
only account that could give it back. The way out is on the server:
`mercato auth denials --tenant <id> --lift <denial-id>`.
