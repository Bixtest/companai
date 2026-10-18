# PLAN — `CC-120`, the agent axis gets a producer

**Status:** requirement written 2026-10-18, before any code. Ruling taken: **the credential axis** (owner,
2026-10-18, choosing (a) over (b) from the register row).
**Register row:** `CC-120` in `MASTER-CHECKLIST.md` §5. **Parent:** `SR-07` / `CC-107`.

---

## 1. THE DEFECT, MEASURED

`AiChatConversationContext.agentId` is **read** in two places and **written** by nobody:

| Site | What it does |
|---|---|
| `AiChatConversationRepository.ts:885-891` (`loadParticipantFlag`) | after the human lookup misses, asks whether the caller's **machine** identity is a participant |
| `AiChatConversationRepository.ts:314-316` (`list`) | unions the human and machine membership axes |

Every construction site of a repository context passes `{ tenantId, organizationId, userId }` and stops:

- `api/ai/chat/route.ts:316-320` (`persistChatTurnStart`) — the only place a turn is persisted;
- `api/ai/chat/route.ts:439-443` (`persistAssistantOnStreamCompletion`) — the assistant message;
- `api/ai/conversations/route.ts:240`, `import/route.ts:92`, `[conversationId]/route.ts:201/271/328`,
  `participants/route.ts:209`.

So the read path is **proven and unreachable** — the `CC-101` shape (*a checker nothing calls*).

## 2. THE DONOR RE-READ — at the source, and it settles the design

Read at `zerver/decorator.py:313-334` (`access_user_by_api_key`) and `:258-276` (`validate_api_key`):

```python
user_profile = get_user_profile_by_api_key(api_key)   # the key resolves to an identity
...
request.user = user_profile                            # set ONCE, at the boundary
```

**The donor has no bridge because the credential lives ON the identity row** (`UserProfile.api_key`), so a
bot authenticates *as itself*: `request.user` is the bot's own profile, `is_bot=True`
(`zerver/models/users.py:556`). `bot_owner` (`:558`) is used for **administration**
(`users.py:781`: `if target_user.bot_owner_id == self.id`) and for who receives the bot's messages
(`bot_owner_user_ids`, `:1233-1247`) — never to resolve *who the credential is*.

**HARVEST — the principle, which is the whole design:**
1. **The credential resolves to exactly one identity, once, at the boundary, and every later check reads
   that identity rather than re-deriving it.** Our equivalent boundary is `derivePrincipal` /
   `requirePrincipal`; the enrichment is that the **agent axis is resolved at the same boundary** and
   carried as data, instead of being computed by each consumer.
2. **The identity is validated against its scope before it is used** (`validate_account_and_subdomain`,
   `decorator.py:277-310`). Our analogue already holds: the binding lookup is tenant/org-scoped
   (`agent-binding.ts:75-85`), so a credential bound in tenant A cannot produce an axis in tenant B.
   **The fix must not weaken that**, and the proof must say so.

**REFUSE, by name:**
- **`api_key` stored on the identity row.** We refuse agents as rows in the auth `User` table (`CC-107`'s
  REFUSED list), so our credential is a separate object and **something must say which agent it acts as**.
  The bridge is the **price of that refusal**, not an accident — and the bridge already exists:
  `ai_agent_bindings.principal_id` is documented as *"the `api_keys` id of the AI-user principal"*
  (`data/entities.ts:1097-1103`).
- **The optional `email` cross-check on the key** (`decorator.py:322-327`). It is a second factor the donor
  can afford because the email lives on the same row; we have no such pairing and should not invent one.
  The binding is the check.

## 3. THE REQUIREMENT

- **R1 — the producer is the credential, not the target.** Only a principal of kind `ai_worker` may carry
  an agent axis, and the value is the agent its **live binding** names. The request's `agent` parameter
  alone must never produce an axis.
- **R2 — one resolution.** The function that already proves the binding is the function that reports the
  axis. No second lookup, no second source of truth: `resolveAgentBinding` gains `agentAxis` on its bound
  arm — `agentId` for a bound `ai_worker`, `null` for a human.
- **R3 — a human never carries it.** A human chatting with agent X is still a human; giving them the axis
  would turn *"which agent the turn is for"* into an authorisation, which is the cheap-and-wrong design the
  ruling rejected. The proof must include this negative.
- **R4 — read-only consequence, stated so nobody assumes more.** The axis reaches `loadParticipantFlag` and
  `list`. It does **not** grant writes: `createOrGet` and `appendMessage` stay owner-only
  (`AiChatConversationRepository.ts:230`, `:556`), which is consistent with `viewer` being the only
  participant role that exists (`addParticipant`'s signature). *"A bot is a participant"* therefore means
  **a bot credential can read a conversation it was added to**; posting into someone else's conversation is
  a different capability and is not in this row.
- **R5 — scope preserved.** The axis is only produced from a binding resolved in the caller's tenant/org.

## 4. THE DESIGN

1. `lib/agent-binding.ts` — `ResolvedAgentBinding`'s bound arm gains `agentAxis: string | null`.
   - `human` → `null` (unchanged behaviour, `B4`);
   - `ai_worker` + live binding → `agentId`;
   - every refusal path is untouched.
2. ~~`api/ai/chat/route.ts` — thread the axis into the two context builders.~~ **WRITTEN, THEN REVERTED
   (see §7): the two methods those contexts feed ignore the axis, so the wiring would have been inert.**
3. **Nothing else changes.** No new table, no new query, no new route.

## 5. THE PROOF

| # | Claim | Test |
|---|---|---|
| 1 | a bound `ai_worker` reports `agentAxis === agentId` | `lib/__tests__/agent-binding.test.ts` |
| 2 | a human reports `agentAxis === null` | same |
| 3 | an unbound `ai_worker` is still refused, and reports no axis | same |
| 4 | the axis grants read and nothing else | already proven: `AiChatConversationRepository.test.ts`'s five agent-axis tests |
| 5 | a machine turn's context carries the axis | **NOT BUILT — reverted, §7** |

**Mutations, one per claim that could silently revert:**
- `agentAxis: agentId` → `agentAxis: null` ⇒ claims 1 and (when it exists) 5 RED — measured: **2 tests RED**;
- `agentAxis` set for humans too ⇒ claim 2 RED — measured: **3 tests RED**, including the pre-existing
  exact-`toEqual` assertion on a human conversation context, which is an independent confirmation that
  the human path was already pinned;
- the axis dropped from the write context ⇒ **measured 1 RED** before the wiring was reverted.

**Measured after the revert:** package **135 suites / 1,996 tests**, `tsc` 0. The +1 over `CC-107`'s 1,995
is the split of one test into two (bound-with-axis, and the human negative) — no test was added for the
reverted wiring, because a test for it would have been asserting an inert value.

## 6. WHAT THIS DOES NOT DO

- **No write path.** See R4. If a bot must *post* into a conversation it does not own, that is a role
  question (`viewer` vs a new role), not a producer question.
- **No new identity.** An `ai_worker` credential is still an API key; there is no second credential type.
- **No change to the other routes.** The UI routes act for a person; giving them an axis would be R3's
  mistake with a different entry point.
- **No HTTP surface for the axis itself.** It is not a parameter and must never become one — the ruling is
  that it is derived, not supplied.

---

## 7. WHAT SHIPPED, AND THE CONSUMER THAT IS STILL MISSING — measured after the first build

The derivation landed: `resolveAgentBinding` reports `agentAxis` (`agentId` for a bound `ai_worker`,
`null` for a human), with **3 mutations RED** and the package green. Then the wiring was attempted and
**reverted**, because measuring the consumer killed the design I had assumed:

**`ctx.agentId` is read in exactly two places, and neither is on a machine's path.**

| Consumer | Called by | Reachable by a machine? |
|---|---|---|
| `loadParticipantFlag` (`:885-891`) | **only** `getById` (`:278`) | **no** — `getById` is called from the conversations routes, which act for a person |
| `list()`'s axis union (`:314-316`) | the conversations list route | **no** — same reason |

And the methods that *are* on a machine's path ignore the axis entirely:

- `createOrGet` refuses any caller that is not the owner (`:230`) — the agent axis is never consulted;
- `appendMessage` does the same (`:556`).

So threading `binding.agentAxis` into `persistChatTurnStart`'s context — the first thing I wrote — would
have been **inert**: a value produced into a context whose two consumers are `createOrGet` and
`appendMessage`, both of which ignore it. That is `CC-101` again, and it was reverted rather than shipped.
`git diff` shows the chat route and its test **byte-identical** to `HEAD`; only `agent-binding.ts` and its
test changed.

**What this means, stated plainly:** `CC-120`'s original sentence — *"the read path is proven and
unreachable"* — is still true after the bridge lands. The bridge removed the **identity** half of the gap.
The **surface** half is that no machine-facing route reaches `getById` or `list` at all.

### 7.1 The requirement for the consumer — awaiting the ruling

- **R6 — the axis is a SET, not a single id.** `AiAgentBindingRepository.listForPrincipal` already exists
  (`:65`), and a credential may hold several bindings, so "which agent am I" has no single answer off the
  chat path. `AiChatConversationContext` gains `agentIds?: string[] | null`, with `agentId` kept as the
  one-element shorthand so nothing that works today changes:
  `const agentIds = ctx.agentIds?.length ? ctx.agentIds : ctx.agentId ? [ctx.agentId] : []`.
  `loadParticipantFlag` and `list` then filter `{ agentId: { $in: agentIds } }`.
- **R7 — the minimal consumer is the transcript route.** `GET /conversations/[conversationId]` is the
  smallest surface that makes *"a bot credential can read a conversation it was added to"* true: for an
  `ai_worker` it resolves `listForPrincipal(principal.id, { tenantId, organizationId })` into `agentIds`.
  The list route is the same shape and can follow.

**Why this is a ruling and not a patch:** it **expands what a machine credential can read over HTTP**.
That is a security-bearing change, and this project's rule is that a requirement is written and agreed
before it is built — the same rule that made the *producer* a question in the first place. The honest state
until then is: **the bridge exists and is asserted; no production code reads it yet, deliberately.**

**Why the cheap alternative is refused, by name:** setting `ctx.agentId = <the agent the request names>`
on the *transcript* route. It needs no binding lookup, no set, and no new read — and it lets any credential
that can name an agent read that agent's conversations, which is authorisation by request parameter. That
is the `CC-105` shape (a permit written as a default) with a different entry point.
