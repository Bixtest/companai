# ANALYSIS — what a bot does, and why it is tied to a person

**Date:** 2026-10-18 · **Address:** `CC-120` · **Status:** research, no code, no ruling
**Companion:** `ANALYSIS-2026-10-18-agent-identity.md` (the access question). This one is the *behaviour*
and *ownership* question.

---

## 0. The two questions, and the short answers

> **Q1. What does a bot actually *do* in the systems we studied?**
> Seven distinct jobs, and the systems differ mostly in **how much the bot is allowed to see** — not in what
> it does. The taxonomy that matters is a **privilege ladder**, not a feature list (§3).

> **Q2. Why is a bot tied to a human, such that deleting the human kills the bot?**
> **It isn't — not in any of the four.** The tie is real, but it exists for four reasons, none of which is
> "the bot needs the human to function" (§5). And **nobody hard-deletes a bot when its owner goes**: one
> system deactivates it, one refuses to delete the owner at all, one makes the link immutable, one has no
> link at the workspace level (§6).

**This corrects a claim I put in the diagram I showed you.** I wrote *"person leaves → bot stops working"* as
if it were the nature of delegation. Measured, that is **false as a general rule** — it is one system's
abuse-control choice, applied as *deactivation*, not deletion.

---

## 1. What a bot *is*, in each system

| System | What the bot is | Where it lives |
|---|---|---|
| **Zulip** | a `UserProfile` row with `is_bot=True`, `bot_type`, `bot_owner` | `zerver/models/users.py:556-558` |
| **Buzz** | a keypair, with `agent_owner_pubkey` linking it to its owner | `crates/buzz-db/src/store/channel_members.rs:712` |
| **Multica** | an `agent` row with `owner_id`, `visibility`, `status`, plus a runtime | `server/migrations/001_init.up.sql:36-49` |
| **Slack** | a *bot user* belonging to an installed app | Slack developer docs |

Four different containers, one shared idea: **the machine is a row with an owner, not a setting on
somebody's account.** That is the thing our `ai_agent_bindings` + `participants.agent_id` already matches.

---

## 2. What a bot does — the donor's own taxonomy

Zulip is the only one of the four that names its bot kinds, and the names are a **capability** taxonomy, not a
feature list (`zerver/models/users.py:451-478`):

| Type | Constant | What it may do | The donor's own reason |
|---|---|---|---|
| Generic bot | `DEFAULT_BOT = 1` | full API — read and write | — |
| Incoming webhook | `INCOMING_WEBHOOK_BOT = 2` | **send only, cannot read** | *"less of a security risk to expose their API keys to third-party services, since they can't be used to read messages"* |
| Outgoing webhook | `OUTGOING_WEBHOOK_BOT = 3` | replies when a message matches | listed in `MESSAGE_TRIGGERED_BOT_TYPES` |
| Embedded bot | `EMBEDDED_BOT = 4` | runs inside the server, reacts to events | handled by a `QueueProcessingWorker` |

**The lesson is in the second row.** Zulip does not have one "bot" concept with a permission toggle; it has
**bot types, and the type is chosen at creation**, because "can this thing read our messages?" is the
question users actually care about. A notification bot and an assistant are *different kinds of object*.

---

## 3. The seven jobs, from the end user's point of view

Ordered by how much the bot is trusted. This is the useful list.

| # | The job | What the human does | What the bot may see | Who does this |
|---|---|---|---|---|
| 1 | **The messenger** | nothing — a system posts into a room | nothing; it only writes | Zulip incoming webhook, Slack incoming webhook |
| 2 | **The responder** | mentions it, or a message matches a rule | the message that triggered it | Zulip outgoing/embedded, Slack workflow step |
| 3 | **The helper in the room** | `@bot summarise this` | the room it was added to | Slack assistant, Buzz `@mention` → `buzz-acp` |
| 4 | **The private assistant** | opens a 1:1 chat | that one conversation | our product, Slack DM |
| 5 | **The colleague** | adds it to a conversation like a person | every conversation it was added to, and its own message history | **Zulip (bot = user), Buzz, our `CC-107`** |
| 6 | **The worker on a ticket** | assigns work to it | the task, and whatever the task needs | **Multica** (issue → `agent_task_queue` → agent runs) |
| 7 | **The delegate** | lets it act *with their authority* | whatever they could reach | **Multica's Composio gate**, RFC 8693 `act` |

Three observations that matter for us:

- **Only 1 and 2 avoid reading.** Everything from 3 upward needs the bot to see content, which is why the
  access question exists at all.
- **5 is what we built.** "A bot is a participant" is job 5, and it is the only job that needs *its own*
  membership rather than a per-request grant.
- **6 and 7 are the ones with teeth.** Multica's whole task-token design exists to serve job 6, and its
  `originator == agent.owner_id` gate exists to stop job 7 becoming "the agent gets *your* connected
  accounts".

---

## 4. Where the human sits, in each job

| Job | Does the bot need a human *at the moment of acting*? | Does it need one *at all*? |
|---|---|---|
| 1 messenger | no | no — it has a URL, not an identity |
| 2 responder | no | no |
| 3 helper in the room | no | yes, to be added |
| 4 private assistant | **yes** — it is *their* assistant | yes |
| 5 colleague | no | **no** — once added, it is a member |
| 6 worker | **no** — the task is the authority | yes, to own the agent |
| 7 delegate | **yes, always** — it is spending their authority | yes |

**Job 5 — ours — is the one where the human is needed to *start* the bot and not to *use* it.** That is
exactly the distinction our code currently blurs, because `assertContext` demands a `userId` on every call.

---

## 5. Why the owner link exists — four reasons, each measured

### (a) Ceiling — the bot must never be more powerful than its owner

`zerver/lib/streams.py:632-637` and `:712-717`:

```python
if sender.is_bot and sender.bot_owner is not None:
    bot_owner_recursive_group_ids = set(get_recursive_membership_groups(sender.bot_owner)...)
    if stream.can_send_message_group_id in bot_owner_recursive_group_ids:
        return
```

```python
if sender.is_bot and (sender.bot_owner is not None and subscribed_to_stream(sender.bot_owner, stream.id)):
    # Bots can send to any stream their owner can.
    return {"is_subscribed": is_subscribed}
```

**Read that twice, because it is the whole design in two lines.** Zulip checks the bot's **own** membership
*first*, and only then falls back to the owner's. So the bot has two ways in: its own membership, or its
owner's rights. **The owner is a floor, not a leash.**

### (b) Policy and abuse — a spammer's bots are also spam

`zerver/actions/users.py:470-494`:

```python
if _cascade:
    # We need to deactivate bots before the target user, to ensure
    # that a failure partway through this function cannot result
    # in only the user being deactivated.
    bot_profiles = get_active_bots_owned_by_user(user_profile)
    # Same policies should be applied to the bots as to the user who created
    # them. If the user is marked as spammer or their content is being
    # deleted, the same should happen with the bots created by that user.
```

Note the ordering comment: **bots first, deliberately**, so a crash cannot leave a live bot owned by a
deactivated spammer. That is a considered decision, not a cascade accident.

### (c) Data access — an agent must not inherit somebody else's connections

`server/migrations/129_agent_composio_allowlist_and_task_originator.up.sql:1-12`:

> *"The dispatch hook gates on `(originator == agent.owner_id)` so an agent never gets another user's
> Composio session even if that other user @-mentions it."*

This is the strongest argument for an owner link in an AI system: **the bot is wired to a person's external
accounts**, so "who owns it" decides whose data it can touch.

### (d) Management — the owner is the one who may remove it

Buzz, `crates/buzz-db/src/store/channel_members.rs:706-716`: `is_agent_owner` is resolved so an owner may
remove their own agent from a channel, and the doc notes `agent_owner_pubkey` is **immutable, first-mint-wins**.
The link is a *rights* relationship, and it is deliberately unchangeable.

**None of these four says "the bot cannot work without the human".** They say: the bot is bounded by the
human, answerable through the human, wired to the human's data, and manageable by the human.

---

## 6. What happens when the human is deleted — four different answers

| System | On owner deletion | Mechanism | Is the bot erased? |
|---|---|---|---|
| **Zulip** | bots are **deactivated first**, then the user | `do_deactivate_user(_cascade=True)` `:480-494` | **No.** The row survives, renamed *"Deactivated bot"* (`:506-509`), history intact |
| **Multica** | the deletion is **refused** | `owner_id UUID REFERENCES "user"(id)` with no `ON DELETE` (`001_init.up.sql:46`) | **No** — you cannot delete the owner while an agent references them |
| **Buzz** | nothing cascades; the link is immutable | `set_agent_owner` only sets when `IS NULL` | **No** |
| **Slack** | *(not established)* | the bot user belongs to an installed **app**, not to the installer's account | **No**, on the evidence available |

> **Slack honesty note.** Slack's docs state that *"the bot user component of Slack apps is largely governed
> by a combination of channel membership and granular permissions"* and that *"an app isn't granted to
> specific resources like channels and users"*. That establishes the bot as workspace-level, not
> person-level. I did **not** find a doc sentence stating what happens to the app when the installing user is
> deactivated, so the last cell is **inference, not citation**.

**The pattern across all four: deactivate, or block, or leave alone — never erase.** Which is obvious once
stated: a bot's messages are *in* the conversation. Deleting the bot would orphan the history it wrote. Our
`deleted_at` soft-delete is already the right shape; the open question is not "delete" but "what state does a
bot enter when its owner leaves".

---

## 7. What this changes about my earlier claim

I told you the choice was *"does the bot die with its owner"*, and drew *"person leaves → bot stops working"*
as the cost of option A. **Measured, that is a cost of *our* implementation, not of the architecture:**

- Zulip's bot keeps its own membership and its own rights; the owner link is a *floor*. Deactivation is a
  **policy** decision, taken for abuse reasons, not a technical necessity.
- Multica's agent has a **nullable** human in the chain — `originator_user_id` is documented as *"NULL when
  no human is in the chain (autopilot, system-driven)"*.
- Slack's bot is not person-scoped at all.

So the honest version of the decision is not "A or B". It is **three separate settings**, which any of these
systems lets you choose independently:

| Setting | Options | What it costs |
|---|---|---|
| **Who can the bot reach?** | only what its owner can · its own memberships · its own memberships **or** its owner's | Zulip chose the third. The middle is ours today (if it were wired). |
| **What happens when the owner leaves?** | deactivate the bot · leave it running · block the owner's deletion | Zulip deactivates; Multica blocks; Buzz and Slack leave it |
| **Does the bot need a human per request?** | always · only to start | job 5 needs one only to start |

**That is the decision, and it is three checkboxes, not a fork.**

---

## 8. What I would set, and why

1. **Reach: its own memberships, with the owner's rights as a floor** — Zulip's `:712-717`. It is the only one
   of the three that is both safe and useful, and it needs no new table.
2. **On owner departure: deactivate, never delete** — Zulip's choice, and the only one consistent with keeping
   the transcript. A bot that stops working but whose history stays readable is the least destructive answer.
3. **Per request: only to start** — job 5. A bot added to a conversation is a member; requiring a human on
   every read is what makes `assertContext` the thing to change.

**The prerequisite this exposes:** if the owner's rights are a floor, the repository needs the owner's id on
the context — which `effectiveUserId` already produces, and which is `null` exactly when the key was issued to
nobody. So the floor is already computable, and the "no human" case is already representable as `null`. **The
code has the pieces; nothing assembles them.**
