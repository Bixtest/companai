# PLAN-CC-127 — the departure flow

**Status:** requirement, measured 2026-10-19. No code was written for this phase, per
the owner's rule.
**Row:** `CC-127` in `library/development/MASTER-CHECKLIST.md` §5.
**Answers:** **D4** — *"the admin doing the deactivation decides, at that moment, what
happens to the related agents"*.
**Sibling of** `CC-121` (the instance) and `CC-122` (the hire): this row is what the
platform does when the person an agent belongs to leaves.

---

## 1. The defect, measured

The row states two things. One of them is no longer true, and the other is true for a
reason the row does not name. Both are measured here before anything is designed
(Rule 1).

### 1.1 "A demoted user's assistant keeps working" — FALSE as the code stands

- Role changes run through `auth.users.update`, and that command calls
  `invalidateUserCache` in the same request (`commands/users.ts:650`). The
  five-minute TTL (`services/rbacService.ts:37`) is real, and the invalidation is
  what answers it.
- A run resolves the caller's authority per request, and the agent's own authority
  is read live (D2). There is no cached agent grant to go stale.

So the demotion half is **already closed** by work that landed after the row was
written. Saying so is the point: a row that names a danger which no longer exists
sends the next reader to build a defence against nothing.

### 1.2 "Nothing cascades to bindings or delegations" — TRUE, and the access half fails closed

Measured end to end, for a user who is deleted:

| What survives | Why it cannot act |
|---|---|
| **API keys** | revoked by `api_keys:user-deleted-revoke-keys` (`subscribers/user-deleted-revoke-keys.ts:70`, by `createdBy`), **and** rejected at auth because the user row it resolves through is gone (`shared/lib/auth/server.ts:284`, a deliberate second guard) |
| **Delegations** | `delegationCeilingFor` resolves the grantor **as themselves** and takes their gate as the ceiling (`services/authorityEnforcementService.ts:443-465`); a grantor who no longer exists holds nothing (`:511`), so the gate is `A0` and the act is refused. The row outlives its grantor; the grant does not |
| **Bindings** | `AiAgentBinding.principalId` is an **`api_keys` id** (`data/entities.ts:1098-1100`). The key is dead, so the binding has nothing to authenticate |

**So the assistant stops.** What survives is rows: a binding pointing at a revoked
credential, a delegation pointing at a person who is gone, and **no record anywhere
that anybody decided anything**.

### 1.3 ★ The real defect is the missing decision, not the missing cascade

D4's answer is unimplemented: no surface lists the related agents, none asks, none
records the answer. The platform's behaviour on departure is not a decision — it is
an **accident of three unrelated guards**, and the only durable trace is a pile of
orphan rows an admin cannot tell apart from live ones.

That is `CC-101`'s class on the data side: a row nothing reads, produced by a flow
nobody runs.

### 1.4 Two facts that shape the design

- **The user delete is a HARD delete.** The CRUD config declares
  `softDeleteField: 'deletedAt'` (`api/users/route.ts:123`) and the command bypasses
  it with `soft: false` (`commands/users.ts:803`), deleting ACLs, roles, sessions
  and password resets in one transaction. There is no `isActive` on `User`
  (`data/entities.ts:14-50`) and no row left to re-activate.
  **So "deactivate" cannot mean the person.** It means the agents.
- **A binding's identity is a credential, not a person.** Which is why "leave the
  agent running" is not representable today: the credential dies with its creator,
  so a left binding is inert. An agent that outlives its owner needs an identity of
  its own — `CC-121`'s instance — and that is not this row.

## 2. The chain (CREATES · CHECKS · CONSUMES · DELETES)

| Step | Who | Form today |
|---|---|---|
| **CREATES** | `AiAgentBindingRepository.upsert` (bindings `POST`); `DelegationService.grant`; `api_keys` mint | three unrelated writers, none of which records *who the agent belongs to* |
| **CHECKS** | `resolveApiKeyAuth` (key liveness, `server.ts:284`); `delegationCeilingFor` (grantor liveness, indirectly, `:443`); `checkAgentPolicy` (agent known); `computeBoundRunScope` (tool set) | four guards, none of which knows a person is departing |
| **CONSUMES** | `api/ai/chat/route.ts`, `api/ai/run-object/route.ts`, `lib/agent-tools.ts`, `lib/business-ir-author.ts` — the five call sites `CC-126` taught to take a subject | all of them fail closed once the credential is dead |
| **DELETES** | `api_keys` subscriber (keys); `AiAgentBindingRepository.revoke` (`:160`, soft); `DelegationService.revoke` (`:148`, `revokedAt` + `revokedByUserId`); `auth.users.delete` (hard) | **no single place runs them for a departure**, and nothing records that they were run |

The DELETES row is the whole requirement: the verbs exist, the flow does not.

## 3. ★ The corrections this owes the row (Rule 13)

1. **"A demoted or offboarded user's assistants keep working" is wrong on both
   halves.** Demotion invalidates the cache in the same request (§1.1); departure
   kills the credential twice over (§1.2). The danger is not access.
2. **"Nothing cascades to bindings or delegations" is true and is not a hole.** Both
   fail closed. The defect is the unrecorded decision and the orphan row (§1.3).
3. **"Deactivate / leave / block" does not survive the identity model.** `block`
   needs a policy store the platform does not have (`CC-128`); `leave` cannot mean
   "keeps working" because the principal is a key that dies with its creator. The
   flow therefore offers **deactivate** (default) and **leave** (the row is
   preserved, inert), and says in the receipt that the difference is **the record,
   not the capability**. A UI that implies a living agent would be lying.
4. **The person is never "deactivated" — the row is hard-deleted.** "Never delete"
   is a promise this row can keep only about the **agent** rows.

## 4. The fix

### 4.1 Two endpoints, one module

Both live in `ai_assistant`, because the decision is about agents and the module
boundary must not be crossed in the other direction (`auth` must not learn what an
agent is).

**`GET /api/ai/departures/[userId]`** — the preview. Requires
`auth.users.delete` **and** `ai_assistant.settings.manage`.

Returns `{ user: { id, email, name }, agents: [...], delegations: [...], default: 'deactivate' }`:

- `agents[]` — every live binding whose principal is one of the user's keys, with
  `{ agentId, principalId, keyName, organizationId, keyLink }`. `keyLink` is
  `'session'` when `api_keys.session_user_id = userId` (the key **acts as** the
  person) or `'created'` when only `api_keys.created_by = userId` (the key was
  **minted by** them). **Both links are listed**; the existing `api_keys` cascade
  sees only `created` (`:70`), so the preview is already more complete than the
  cascade it explains.
- `delegations[]` — rows where the user is grantor **or** grantee, with
  `{ id, direction: 'granted' | 'received', capabilityId, expiresAt, alreadyRevoked }`.
- Cross-tenant or unknown user → **404**, never 403: the caller is authorized for the
  verb, so the only honest reason left is that the row is not in their tenant, and a
  403 would confirm the id exists elsewhere.

**`POST /api/ai/departures/[userId]`** — the departure. Body
`{ decision?: 'deactivate' | 'leave' }`, **default `'deactivate'`**.

Order of operations, and why:

1. Read the related rows **before** the delete (they are the receipt, and a
   post-delete read would have to guess which keys were the person's).
2. Execute `auth.users.delete` through the command bus with
   `metadata: { departure: { decision, agents: n, delegations: m } }`. The bus's
   audit entry then carries the decision, so **`auth` records a fact about agents
   without knowing what an agent is** — no schema change, no cross-module import.
3. Apply the decision.
4. Return the receipt.

`deactivate` performs:

- **bindings** — `revokeForPrincipals(principalIds, { tenantId })`, a **new
  repository method**, tenant-wide. The existing `revoke(principalId, agentId, ctx)`
  filters on `organizationId: ctx.organizationId ?? null` (`:167-172`), so a
  per-organization call would silently miss a binding in another organization of the
  same tenant — and a person leaves a **tenant**, not an organization.
- **delegations** — `DelegationService.revoke(id, scope, adminUserId)` for every row
  in both directions, so `revoked_by_user_id` names the admin who decided.
- **keys** — nothing here; the `api_keys` subscriber already did it in the same
  delete. Calling it twice would be a second owner of one fact.

`leave` performs **no writes**. The receipt says, per agent, `stillInert: true` and
the reason (*"the credential dies with its owner"*), so the admin is not told a
living agent was preserved.

**Never a hard delete of an agent row.** `deactivate` is `deletedAt` on the binding
and `revokedAt` on the delegation — both reversible in principle, both auditable,
neither destroying the history an offboarding review needs.

### 4.2 Idempotence and the partial state

- Re-running a departure whose user is already gone → **404**, no writes.
- A binding already revoked → skipped, counted as `alreadyRevoked`.
- A delegation already revoked → skipped, same.
- **The cascade can fail after the delete has committed.** The response is then
  `500 { code: 'departure_partial', userId }`, and the message says the user is gone
  and the agent rows may be untouched. This is the honest answer to a two-step
  operation across two modules: pretending it is atomic would be a lie the audit log
  would contradict. It is also safe — see §5.

### 4.3 What the flow deliberately does not change

- **`auth.users.delete` keeps its behaviour.** An API caller that deletes a user
  directly gets today's outcome: keys revoked, agent rows left. That is `leave` by
  default on a path where nobody was asked, and **the flow is the only place a
  decision exists**. Silently revoking on a path the admin never saw would be the
  surprise this project keeps refusing to ship.
- **No subscriber applies the default.** A subscriber cannot see the decision
  (`auth.user.deleted` carries identifiers, not intent), and one that guessed would
  make `leave` unrepresentable.

## 5. The fail-direction proof, branch by branch

| Branch | Failure direction | Why it is safe |
|---|---|---|
| Cascade throws after the delete | **inert** | the credential is already dead by two independent guards (`server.ts:284`, the `api_keys` subscriber); the worst outcome is orphan rows, never a working agent |
| Cascade throws before the delete | nothing happened | the command bus has not run; the user still exists |
| Caller omits `decision` | **deactivate** | the safe path is the default, and the receipt names it |
| Caller sends an unknown decision | **400**, no delete | a typo must not become a choice |
| Caller in tenant A targets tenant B | **404**, no read | the preview's first query is tenant-scoped |
| `leave` chosen | rows untouched, agents inert | the receipt states it; nothing implies a live agent |
| Preview lists a binding from another tenant | impossible | every read takes `{ tenantId }` as a required parameter (`CC-126`'s rule) |
| Binding in another organization of the same tenant | **revoked** | the cascade is tenant-wide by design (§4.1), which is the opposite of the per-agent route's behaviour and is stated in its docblock |
| Delegation already revoked | skipped | `revoke` checks `revokedAt` (`:156`) |

**The one direction this must never fail:** a receipt that says "deactivated" while a
binding is still live. That is why the receipt is built from the **write results**
(booleans the repository returns), not from the preview's list.

## 6. What this does not claim

- **It does not make an agent outlive its owner.** That needs the instance with its
  own identity (`CC-121`) and the machine axis (`CC-120`). "Leave" preserves the
  record for a future re-home; it does not preserve the agent's ability to act, and
  the flow says so rather than implying otherwise.
- **It does not add `isActive` to `User`.** The person's departure is the hard delete
  that already exists.
- **It does not sweep pre-existing orphans.** A binding whose principal was revoked
  last month stays until someone looks. Recorded in §7.
- **It does not decide `block`.** No policy store exists (`CC-128`).
- **It does not touch the five per-agent manage routes.** They remain code-only
  until `CC-122`, as `CC-126` recorded.

## 7. Open, recorded rather than assumed

- **The orphan sweep.** Needs a liveness verdict for a binding, which needs a join to
  `api_keys` that no repository does today — and `CC-102`'s lesson says a `deleted_at`
  with no writer is worse than none. Not built here.
- **The `api_keys` cascade's blind spot, in the other direction.** It revokes by
  `createdBy` (`:70`), so a key minted by the departing user but **acting as someone
  else** (`session_user_id` = another person) is revoked too. That is api_keys' row,
  not this one; named here because this flow's preview is the first surface that
  makes the two links visible side by side.
- **Re-homing a binding** to a different principal is the natural answer to "leave"
  and cannot be built before the instance exists (`CC-121`/`CC-122`).

## 8. The proof this owes

- **Unit — the cascade module** (`lib/departure.ts`): both key links; deactivate
  revokes bindings tenant-wide and delegations in both directions; `leave` writes
  nothing; idempotence counts `alreadyRevoked`; the receipt is built from write
  results.
- **Unit — the preview**: cross-tenant 404, unknown user 404, a user with no agents,
  a delegation in each direction, `alreadyRevoked` reported truthfully.
- **Route tests**, in the house pattern (`bindings.route.test.ts`): the default
  decision, the 400 on an unknown decision, the 404s, the 403 without either
  feature, and `departure_partial` when the cascade throws after a successful delete.
- **Mutations, RED-then-GREEN** (`scripts/verify-cc127-mutations.mjs`): drop the
  default → the no-decision case must fail; make the cascade per-organization → the
  cross-organization binding must survive and the test must notice; make `leave`
  revoke → the row must disappear; drop the tenant filter on the preview → a second
  tenant's binding must appear; drop one delegation direction → that side must
  survive.
- **A hostile critic** reads the finished slice against this document before
  anything is committed — the same pass `CC-126` took.
