# ANALYSIS — how a machine gets to read a conversation

**Date:** 2026-10-18 · **Address:** `CC-120` · **Status:** analysis, no ruling taken, no code changed
**Why this exists:** the owner asked for the question in plain words, the donor evidence at source, the full
codebase picture (dependencies, prerequisites, future needs), and a recommendation they can decide on.

---

## 1. The question, in one sentence

> When an AI agent — not a person — asks to read a chat conversation, how does the server know *which*
> agent is asking, and is that agent allowed to see *that* conversation?

Everything below is either "what we do", "what four working systems do", or "what is missing before we can
answer it".

---

## 2. What the code does today — measured, not remembered

### 2.1 An actor has a *kind*, and a machine's kind is carried by its credential

`packages/shared/src/lib/auth/principal.ts`

| Fact | Where | Consequence |
|---|---|---|
| Four kinds: `human`, `ai_worker`, `service`, `system` | `:27` | the platform can tell a person from a machine |
| A credential's subject string encodes the kind: `api_key:<uuid>`, `ai_worker:<uuid>` | `:66`, `:74`, `:86-92` | the kind is derived, never supplied by the caller |
| `effectiveUserId(auth)` = the human a machine acts for, `null` if none | `:174-179` | "who is this for" and "who is this" are **two different fields** |
| `Principal.id` = the key id for a machine, the user id for a person | `:130` | the machine has its own identity, distinct from the human's |

This is the single most important existing fact: **the platform already separates "who is acting" from
"who it acts for".** It is not a new idea we are introducing.

### 2.2 A credential can be bound to an agent id

`ai_agent_bindings` (`data/entities.ts:1077-1123`)

- `principal_id` — *"the `api_keys` id of the AI-user principal"* (`:1097-1099`)
- `agent_id` — the code-declared agent (`<module>.<agent>`), text
- tenant-scoped, org-optional, with a soft-delete column

`resolveAgentBinding` (`lib/agent-binding.ts:50`) looks it up at `:100` with
`repo.findBinding(principal.id, agentId, ctx)` and — since this week — reports `agentAxis` at `:112`.
So **credential → agent id is already answerable, from one place, with the tenant scope applied.**

### 2.3 A conversation participant can be a person *or* a machine

`ai_chat_conv_participants` (`data/entities.ts:888-916`): `user_id` nullable, `agent_id` nullable,
`agent_owner_user_id` required when `agent_id` is set, plus four partial unique indexes and `num_nonnulls`
CHECKs (migration `Migration20261017180000_ai_chat_participant_agent_axis.ts`).

### 2.4 The access decision consults both axes

`data/repositories/AiChatConversationRepository.ts`

```
canAccessConversation(row, ctx, isParticipant)   :908-914
  = canManageConversations(ctx) || row.ownerUserId === ctx.userId || isParticipant
```

and `isParticipant` comes from `loadParticipantFlag` (`:853-892`), which asks two indexed questions:
*"is this user a member?"* then *"is this agent a member?"*. Two queries, deliberately not one `$or`,
because each axis has its own index.

### 2.5 But the context still requires a human

```
assertContext(ctx, method)   :894-903
  requires ctx.tenantId
  requires ctx.userId          <-- ALWAYS
```

and the type's own doc says it outright (`:38-43`):

> *"an agent caller still carries the person it acts for in `userId` (see `effectiveUserId`)"*

**So the architecture we have already chosen is delegation: a machine is only ever a machine *through* a
person.** The agent axis is a second grant, never a substitute for one. That was never written as a
decision — it fell out of `assertContext` — and it is the thing that actually needs ruling.

### 2.6 There is exactly one read door, and it is shut for machines

`getTranscript` has **one** caller: `api/ai/conversations/[conversationId]/route.ts:202`.
That route builds its context at `:204-209` as
`{ tenantId, organizationId, userId: callerCtx.userId, canManageConversations }` — **no `agentId`.**

And `callerCtx.userId` is `auth.sub` (`:167`), i.e. the raw subject string. For a machine that string is
`ai_worker:<uuid>` or `api_key:<uuid>`. `loadParticipantFlag` then puts it into a **`uuid` column**
(`entities.ts:908`) — Postgres answers `22P02 invalid input syntax for type uuid`, i.e. **a 500**.

> **This is the same defect class that `CC-107` increment 1 fixed in the chat route, and this route was
> missed.** The only route an agent would use to read a conversation does not merely lack the agent axis —
> it breaks before it reaches the access check. Measured, not inferred: `[conversationId]/route.ts:167`
> is the only conversation route still passing `auth.sub`; `conversations/route.ts:130`,
> `participants/route.ts:160` and `participants/[userId]/route.ts:177` all use `effectiveUserId`.

### 2.7 Nothing distinguishes a machine at the RBAC gate either

`metadata.requireAuth` + `requireFeatures: ['ai_assistant.view']` (`:107-111`). A key holding that feature
passes. There is no "human-only" concept on these routes — no analogue of an actor-source flag.

---

## 3. What depends on it

| Dependency | Direction | Why it matters |
|---|---|---|
| `getTranscript` | 1 caller (the transcript route) | one door, so changing it is cheap |
| `createConversationStorage` | 10 call sites | all go through the same repository, so the context shape is a shared contract |
| `assertContext` | every repository method | relaxing `userId` touches **all** of them at once — this is the real cost of the "first-class bot" design |
| `serializeAiChatConversation(callerUserId)` | transcript + list | decides "is this mine", so a bot viewer needs an answer for a null `callerUserId` |
| `getParticipantCount` | transcript route | tenant-scoped, axis-blind, safe |
| UI | consumes list + transcript | a bot-authored conversation must still render for a human |

**Prerequisites that already exist:** actor kinds, the binding table, the two-axis participant table, the
two-axis predicate, the revoke path, `listForPrincipal` on the binding repository.

**Prerequisites that do not exist:**
1. an actor-class gate on conversation routes (human-only / machine-only),
2. `assertContext` allowing a machine-only context,
3. a route that derives `agentId` from the credential,
4. an answer to "what is `callerUserId` for a bot viewer".

**Future needs, named:** the per-tenant engine/daemon (`SR-12`) is the thing that will *call* this. Until it
exists there is no machine making requests, which is why building the door now would be inert.

---

## 4. What four working systems do — read at source

### 4.1 Zulip — the bot **is** a user

`zerver/models/users.py:556-558`: `is_bot`, `bot_type`, `bot_owner` are columns on `UserProfile`.
Access to a channel is a `Subscription` row, and the read path is
`access_stream_by_id` → `access_stream_common` (`zerver/lib/streams.py:1022-1043`).
Authentication: `get_user_profile_by_api_key` returns the `UserProfile` and sets `request.user`
(`zproject/backends.py` via `zerver/decorator.py:313-334`).

> **The key resolves straight to the identity because the key lives ON the identity row.** There is no
> bridge in Zulip. Our refusal of "an agent is a row in the auth `User` table" is exactly why we need one.

### 4.2 Buzz — the agent has its **own key**, owned by a person

`ARCHITECTURE.md:5`: *"AI agents and humans are first-class equals"*. Agents sign their own Nostr events;
`users.agent_owner_pubkey` links each agent to its owner, and the relay *"keeps the agents the signer owns"*
(`:309`). Access is channel membership, same as a person.

### 4.3 Multica — the **task token** binds both identities, and the server stamps them

`server/internal/middleware/auth.go:96-135`:

- a `mat_` token is *"minted by the server at task-claim time"* and carries a bound
  `(user_id, agent_id, task_id, workspace_id)` quadruple;
- the middleware **overwrites** `X-User-ID`, `X-Agent-ID`, `X-Task-ID`, `X-Workspace-ID` from the token row,
  and **strips** whatever the client sent (`:74-90`);
- `X-Actor-Source: task_token` lets human-only handlers refuse machine callers without re-querying.

**And the comment records why, in a way we should not have to rediscover:**

> *"BOTH ids are readable by any workspace member (GET /api/issues/{id}/task-runs returns agent_id +
> task_id), so a member could replay a live pair on their own JWT/PAT and be resolved as that agent …
> MUL-3428, reported and fixed in #4313."*

That is the exact failure the owner's ruling named in the abstract: **identity taken from the request
instead of from the credential.** Multica shipped it, was exploited in the sense that it was possible, and
fixed it by moving the stamp to the server.

### 4.4 Slack — membership of the *bot*, stated in the docs

`conversations.history` (docs.slack.dev):

| Token | Accessible conversations |
|---|---|
| Bot token | *"Any conversation the relevant bot is a member of."* |
| User token | *"Any private conversation the user is a member of, and all public conversations."* |

Error `not_in_channel`: *"The token used does not have access to the proper channel. Only user tokens can
access public channels they are not in."*

**A bot is strictly less privileged than a person, and its privilege is membership.**

### 4.5 The standard that names our two axes

RFC 8693 (OAuth 2.0 Token Exchange) §4.1: a delegation token carries `sub` (**who the token is for**) and
`act` (**who is acting**). Keycloak's impersonation tokens ship exactly this pair.
**Our `effectiveUserId` is `sub`; our `agentAxis` is `act`.** We did not invent the split — we re-derived a
standard one, which is a good sign, not a coincidence.

### 4.6 The convergence

| System | machine identity | how access is decided | can a client name the actor? |
|---|---|---|---|
| Zulip | user row with `is_bot` | subscription row | no |
| Buzz | own keypair + owner link | channel membership | no |
| Multica | task token `(user, agent, task)` | the task row | no — stripped and re-stamped |
| Slack | bot user | bot's channel membership | no |
| **ours** | `api_key` row + `ai_agent_bindings` | participant row, two axes | **no — but nothing reads it** |

**5 of 5 agree on the rule; we are the only one where the rule is unenforced because no route reads the
identity.**

---

## 5. The two coherent architectures

### (I) Delegation only — *a machine is always somebody's hands*

- `assertContext` keeps requiring `userId`.
- `agentId` is an **additional** grant: you need a member agent **and** the human it acts for.
- A bot cannot exist without an active human. If the human is deactivated, the bot stops.

**Cost today:** almost zero — this is what the code already does. **Cost of the alternative later:** every
repository method's contract changes.

### (II) First-class bot — *a machine is its own principal*

- `assertContext` accepts `tenantId` + (userId **or** agentId).
- A participant row with only `agent_id` grants access on its own.
- `agent_owner_user_id` becomes attribution, not authority.

**Cost:** touches every repository method, the serializer, the "is this mine" question, and the audit trail.
**Benefit:** matches all four donors; a bot survives staff turnover; the daemon can act with no human in the
loop.

### (III) Hybrid — Multica's answer

Both identities on every machine request, plus an **actor-source flag** so a route can say *"humans only"* or
*"machines only"*. This is (I) with (II) available where it is needed, and it is the only one of the three
that can be adopted incrementally without a rewrite.

---

## 6. Recommendation

**Do not build the bot's read door now. Fix the two defects that are real today, and adopt the hybrid shape
as the target.**

Three reasons, in order of weight:

1. **There is no machine to call it.** `SR-12` (the per-tenant engine) is not built. A door with no caller is
   the exact defect `CC-120` was opened to remove — building it now would repeat the mistake in the same
   row. *(This is the rule the register already enforces: "no caller = defect".)*
2. **The route is broken before the design question is reached** (`:167`, `auth.sub` into a uuid column). That
   is a bug, not a decision, and it is fixable in one line with the pattern already used three times.
3. **The delegation-vs-first-class choice should be made when the daemon exists**, because that is when we
   learn whether a bot must survive its owner's deactivation. Guessing now writes a contract we would have to
   break.

**What to do now, concretely:**

| # | Action | Size | Address |
|---|---|---|---|
| 1 | `[conversationId]/route.ts:167` → `effectiveUserId(auth)`, refusing when `null` | 1 line + test | `CC-121` (new) |
| 2 | Record the actor-class rule: conversation routes are human-authenticated *today*, and say so where a reader looks | a paragraph | `CC-120` note |
| 3 | Leave the bot's door to `SR-12`, with §5(III) written down as the target shape | the doc you are reading | `CC-120` |

**What would change my mind:** if the daemon is expected to run with no human owner at all (a shared engine
serving a tenant), then (I) is already wrong and (II) must be decided *before* `SR-12`, not after — because
`SR-12` is where the daemon's identity is minted, and minting it wrong is expensive to undo.

---

## 7. What I got wrong before, stated plainly

I presented "the credential axis vs the addressed-agent axis" as the decision. **It was not the decision.**
It was the easy half — and the owner's instinct that it did not add up was correct, because I had not
measured the route that would consume it. The real decision is §5, and it is about **whether a machine can
own access in its own right**, not about which field feeds a context object.
