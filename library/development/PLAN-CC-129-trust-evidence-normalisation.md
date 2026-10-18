# PLAN-CC-129 — a machine's trust evidence can never be read

**Status:** requirement, measured 2026-10-18. Build follows.
**Row:** `CC-129` in `library/development/MASTER-CHECKLIST.md` §5.
**Same class as `CC-124`, other direction.**

---

## 1. The defect, measured

`TrustService.evidenceFor` joins `action_logs.actor_user_id = principalId`
(`services/trustService.ts:94`). That column is the **bare uuid** — the platform
narrows the subject to one on the way in, exactly as `CC-124` established and as
`audit_logs`'s own column comment states.

The write side of the same path takes a **free-form string**:

- `api/authority/trust/route.ts:45` — GET reads `url.searchParams.get('principalId')`
  with **no sibling kind** and hands it straight to `tierFor` and `evidenceFor`.
- `api/authority/trust/route.ts:91-93` — POST's `promoteSchema` takes
  `principalId: z.string().min(1).max(200)` with `principalKind` in a *sibling*
  field, and both are passed to `trust.promote(...)` unmodified.

`AuthorityTrustGrant` is built the CC-124 way — `principal_id` is `text` with
`principal_kind` beside it (`data/entities.ts:813-817`). So the table expects the
bare id and the route may hand it a prefixed one.

**Consequence:** only the bare form works. An admin who sends
`ai_worker:<uuid>` — the spelling the principal's own `kind` field invites, and
the one every other surface used to document — gets **empty evidence**, so a
promotion that requires evidence is refused. It **fails closed**, which is why
nobody has reported it: a missing permission is invisible until somebody looks
for it.

Worse than a refusal, if the evidence gate is ever loosened: `promote` writes the
grant under whatever key it was given (`:143`), so a prefixed write would create
a grant the reader — which is always bare — could never find again.

## 2. The chain (CREATES · CHECKS · CONSUMES · DELETES)

Read all four, not the one the row named:

| Step | Who | Form today |
|---|---|---|
| **CREATES** | `trust/route.ts` GET, query param | free-form, **no kind** |
| **CREATES** | `trust/route.ts` POST, `promoteSchema` | free-form + sibling kind |
| **CHECKS** | `evidenceFor` → `action_logs.actor_user_id` (`:94`) | **bare** |
| **CONSUMES** | `authorityEnforcementService:279` → `principal.id`, from `parseSubject` (`:268`) | **bare** |
| **DELETES** | none — the route states there is no demotion endpoint | — |

Every caller of the four trust methods, measured rather than assumed
(`grep -rn "\.promote(\|\.demote(\|\.tierFor(\|\.evidenceFor("`, tests excluded):

- `trust/route.ts:52,53` — GET boundary
- `trust/route.ts:91` — POST boundary
- `auth/di.ts:104` — a **pass-through proxy**; its consumer is
  `authorityEnforcementService:426`, fed by `parseSubject`
- `trustService.ts:130,137` — internal to `promote`
- `trustService.ts:201,203` — internal to `demote`

## 3. ★ The correction this owes the register row

The row says: *"normalise `principalId` on the trust route exactly as the
authority routes now do, **and read with the same normaliser at `:426`**."*

**The second half is unnecessary, and shipping it would be ceremony.**
`decideFor` calls `parseSubject(subject)` at `authorityEnforcementService.ts:268`
and passes `principal.id` at `:279` — and `parseSubject` **strips any agreeing
prefix** and returns the bare id. So the reader is already bare by construction,
and a normalisation call there would be a no-op that *implies* a guarantee the
code already has.

Rule 13, by name: the row's prescribed fix is half wrong. The fix is smaller than
recorded, and that is the honest outcome of re-measuring.

## 4. The fix

Ship the `CC-124` shape at the two boundaries only:

1. **GET** (`:45`) — normalise with **no kind**. A subject with no sibling kind
   cannot disagree, so an agreeing prefix strips to bare. A bare subject is
   accepted, which is what every existing caller sends.
2. **POST** (`:91`) — normalise with the schema's `principalKind`. An agreeing
   pair strips to bare; a **disagreeing** pair is refused at the boundary with a
   **400** and the thrower's own message, exactly as the authority routes now do.

Nothing changes inside `TrustService`: its methods take the id a caller already
narrowed, and its only other callers are internal.

**Refused by name:** adding a `kind` parameter to `tierFor`/`evidenceFor`. They
are called with a bare id from `parseSubject` today, and widening their
signatures to defend against a caller that does not exist would be speculative
surface.

## 5. Fail-direction proof, branch by branch

| Input | Before | After | Direction |
|---|---|---|---|
| GET, bare id | evidence found | evidence found | unchanged — the working case stays working |
| GET, `ai_worker:<id>` | **empty evidence → promotion refused** | evidence found | **widened to correct** |
| GET, `api_key:<id>` | **empty evidence → refused** | evidence found | **widened to correct** |
| GET, `""` | falsy → `empty` early-return at `:80` | normaliser throws → **400** | closed → closed, and now *explained* |
| GET, `: ` (whitespace) | truthy → query misses | normaliser trims → bare id | fixed |
| POST, bare id + matching kind | grant written bare, found | identical | unchanged |
| POST, `ai_worker:<id>` + `ai_worker` | **empty evidence → refused**; if it passed, grant written under a key the reader can never find | evidence found; grant written bare | **fail-closed → correct** |
| POST, `ai_worker:<id>` + `human` | evidence looked up under the bare id, grant written with `principalKind: 'human'` — **the two halves name different actors** | **400**, refused | **fail-OPEN → fail-CLOSED** |

The last row is the reason this is a security fix and not a convenience: today
the request's two halves can name different actors and the platform trusts one of
them silently. `CC-124`'s rule — a prefix that disagrees with the declared kind
must throw, never be guessed — now holds on every surface that takes both.

**Proved fail-closed:** an empty `principalId` and a disagreeing pair both refuse
before any read or write. Nothing in this change can turn a refusal into a
promotion.

## 6. What this change does not claim

- It does not make trust evidence *correct*. `action_logs` must actually carry
  the machine as `actor_user_id`; this only stops the lookup from guessing.
- It does not add a demotion endpoint. `demote` exists on the service and has no
  route, which is the design stated on the route file ("There is no demotion
  endpoint"), not an oversight this closes.
- It does not touch `AuthorityTrustGrant` rows written before it. A row written
  with a prefixed id is still prefixed; `CC-124`'s migration already rewrites the
  authority tables, and this table is **not** one of the three it names — see §7.

## 7. Open, recorded rather than assumed

`CC-124`'s migration (`Migration20261018120000`) rewrites `authority_denials`,
`authority_delegations` (grantor + grantee) and `authority_project_memberships`.
**`authority_trust_grants` is not among them.** If any row there was written with
a prefixed `principal_id`, it is still unreadable. Measured: the route is the only
writer and there is no evidence it was ever called with a prefix — but "no
evidence" is not "no rows", so this is named as a follow-up rather than closed.
