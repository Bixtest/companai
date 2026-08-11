# Earned autonomy

**In one sentence.** A principal earns the right to act with less supervision, one
tier at a time, on evidence — and loses it automatically the moment the evidence
turns.

**Why it matters.** This is the **only input to the resolver that widens**.
Everything else — the org graph, delegation, record locks, the invoker's
authority, data classification — can only take autonomy away, which makes them
safe by construction. Trust is safe for a different reason: promotion is hard and
demotion is easy.

---

## The tiers

| Tier | Name | Ceiling | Meaning |
|---|---|---|---|
| **T0** | Shadow | `A1` | Proposes; a person performs |
| **T1** | Supervised | `A2` | Every act approved first |
| **T2** | Reviewed | `A3` | Runs after a hold window unless vetoed |
| **T3** | Trusted | `A4` | Runs, then is reviewed |
| **T4** | Autonomous | `A5` | Runs and is logged |

**Reads are exempt at every tier.** A worker that may not read cannot do anything,
and reading is not the act anybody needs protecting from.

**`T0` is `A1`, not `A0`.** Planning gives two values — *"A0 (effects), A1
(proposals)"* — and `A1` **is** propose: the worker produces a proposal and a
person performs the act, so a direct effect is already impossible. Mapping `T0` to
`A0` would forbid it from proposing, which is the entire activity `T0` exists for.

**A tier is a ceiling, not a promise.** `T4` yielding `A5` does not mean an act
happens unreviewed — the effect-class matrix, tenant policy, the org graph, the
record's state and the invoker's authority all still apply, and the answer is the
minimum of all of them.

## Trust is per capability group

Not global (planning 02 §5.1). The group is the **capability's module**, so a
worker can be `T3` on `directory` and `T0` on `messages`. One number would be
either uselessly conservative or dangerously optimistic.

## Promotion, and the three things nobody can check

The specification names five criteria. **Two are computable here:**

| Criterion | Status |
|---|---|
| ≥ 50 completed acts in the group | computed from `action_logs` |
| Reviewer override rate < 5% | computed from `execution_state = 'undone'` |
| No open incidents ≥ medium | **not verified** — no incident model exists |
| Evaluation suite passing | **not verified** — evaluation suites do not exist |
| No charter change | **not verified** — charters do not exist |

A **failed** criterion refuses the promotion. An **unverifiable** one does not —
blocking on it would make promotion impossible until three unrelated features
exist. It is recorded on the grant and in the audit trail instead, so the gap
travels with the decision.

That is why a human approval is still required: **the evidence gates the decision,
it does not make it.**

```bash
# What has this worker earned, and on what evidence?
curl '/api/auth/authority/trust?principalId=<id>&capabilityGroup=directory'

# Raise it one tier
curl -X POST /api/auth/authority/trust -H 'content-type: application/json' -d '{
  "principalId": "<id>", "principalKind": "ai_worker",
  "capabilityGroup": "directory", "reason": "50 clean acts, no reversals"
}'
```

Guarded by **`auth.trust.promote`**, which is not delegable — handing on the power
to raise autonomy is how graduated trust becomes a formality. A refusal comes back
as **409**, not 403: the caller's permissions are fine; it is the evidence that
said no.

## Demotion

**Automatic, immediate, and needs no approval** — invariant **I9**, where the
asymmetry is the safety property rather than an inconsistency. It runs when an act
is reversed, not on a schedule, because a sweep would leave a worker at its old
tier for however long the interval is.

There is **no demotion endpoint**. Demotion is not something a person requests.

Demotion also **clears the evidence** that justified the old tier: evidence for
`T3` is not evidence for `T2`, and leaving it attached would let the next reader
think the lower tier had been earned on it.

## Three failure directions worth knowing

- **A missing row means `T0`.** Absence is the bottom of the scale.
- **An unreadable tier parses to `T0`.** This is the one field where a parsing
  failure could *grant* something.
- **`T0` supplies no ceiling at all.** It says exactly what the untrusted-machine
  default says, so the resolver falls through to the clearer message — *"no trust
  record for this worker"* rather than a code.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/trust.ts` | Tiers, ceilings, promotion and demotion rules — all pure |
| `packages/core/src/modules/auth/services/trustService.ts` | Storage, and the evidence aggregate |
| `packages/core/src/modules/auth/api/authority/trust/route.ts` | The API |
| `packages/core/src/modules/auth/services/authorityEnforcementService.ts` | `trustCeilingFor` — where it reaches the resolver |
