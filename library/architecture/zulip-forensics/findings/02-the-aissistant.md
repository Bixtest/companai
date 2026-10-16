# Zulip Study — Batch 02: the aissistant (P1)

**Status:** DONE · **Date:** 2026-10-16 · **Pole:** **P1 — the aissistant**
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**The question this batch answers:** *how does a machine participate in a conversation in
Zulip?* Zulip predates the LLM era by a decade, so its "machine participant" is the **bot** —
and this batch reads the bot model, the bot API surface, the outgoing-webhook seam, **and the
one genuine LLM integration that has been added on top** (topic summarisation). Per rule 1, the
`docs/subsystems/` prose is quoted but every claim is traced to code.

**Headline before the detail:** Zulip is the **second platform in the study with a real LLM
call in its core** (n8n was the first, via `@n8n/agents`), but where n8n built an *agent
framework*, Zulip added **one narrow, permission-gated, cost-metered feature**: "summarise this
topic." The interesting architecture is not the call — it is the **fence around the call**.

---

## §2.1 The bot taxonomy — four types, one field

`zerver/models/users.py` defines the bot taxonomy as **integer constants on `UserProfile`**
(`users.py:453-473`):

```python
DEFAULT_BOT = 1            # "Generic bot"
INCOMING_WEBHOOK_BOT = 2   # "Incoming webhook"
OUTGOING_WEBHOOK_BOT = 3   # "Outgoing webhook"
EMBEDDED_BOT = 4           # "Embedded bot"
```

| # | Type | Who drives it | Where it runs |
|---|---|---|---|
| 1 | **Generic bot** | An external program holding an API key | Your server |
| 2 | **Incoming webhook** | A third-party service POSTs a message in | Their server → Zulip |
| 3 | **Outgoing webhook** | Zulip POSTs a message out, gets a reply | Zulip → their server |
| 4 | **Embedded bot** | Zulip's own worker hosts the bot's Python | **Inside Zulip** |

**A bot is not a separate entity.** It is a `UserProfile` with `is_bot = True` and a `bot_type`
(`users.py:557`: `bot_type = models.PositiveSmallIntegerField(null=True, db_index=True)`). A bot
has an email, a full name, an avatar, and can be @-mentioned **exactly like a human**. **This is
the single most important P1 fact in the batch:** Zulip did not invent an "agent" object — it
made the machine a *user*, and let every existing mechanism (mentions, DMs, subscriptions,
permissions) apply unchanged. The taxonomy above is only about *how the bot's brain is wired*.

**Two of the four fire on a message; two do not** (`users.py:476-479`):

```python
MESSAGE_TRIGGERED_BOT_TYPES = [
    OUTGOING_WEBHOOK_BOT,
    EMBEDDED_BOT,
]
```

Only **type 3 and type 4** are triggered by an incoming message. Generic bots (1) act when their
external program decides to; incoming webhooks (2) act when a third party decides to.

---

## §2.2 The bot API is a deliberately restricted façade

The most carefully-designed artefact in the whole P1 surface is `zerver/lib/bot_lib.py`
(166 lines) — in particular `EmbeddedBotHandler` (`bot_lib.py:70-160`). It is **not** a general
API client. It is a **hand-written capability set**, and the code says so in its own
constructor comment:

```python
class EmbeddedBotHandler:
    def __init__(self, user_profile: UserProfile) -> None:
        # Only expose a subset of our UserProfile's functionality
        self.user_profile = user_profile
        self._rate_limit = RateLimit(20, 5)
        ...
```

**The complete capability set of an embedded bot** (measured, `bot_lib.py`):

| Method | What it does | Implemented? |
|---|---|---|
| `send_message` | Post to a channel/topic or DM | ✅ |
| `send_reply` | Reply into the same conversation | ✅ |
| `react` | Add an emoji reaction | ❌ `return {}  # Not implemented` |
| `update_message` | Edit a message | ❌ `pass  # Not implemented` |
| `storage` (`.get/.put/.remove/.contains`) | A small per-bot key-value store | ✅ |
| `get_config_info` | Read bot config | ✅ |
| `quit` | Terminate | ✅ (raises) |

**Three design decisions worth naming (rule 6):**

1. **The façade is narrow on purpose.** A bot cannot read messages it wasn't sent, cannot see
   the channel list, cannot touch settings, and cannot reach the database. The comment *"Only
   expose a subset of our UserProfile's functionality"* is the whole security model.
2. **Two methods are declared and left empty** — `react` and `update_message`. They exist to
   satisfy the interface so that the *external* bot framework (which does implement them) can
   share the shape. **This is a divergence the study must record (D2-*):** an interface with
   methods that do nothing, distinguished only by a comment.
3. **A rate limit is built into the constructor** — `RateLimit(20, 5)` (20 requests, presumably
   per 5 seconds; from the external `zulip_bots.lib`). A bot cannot flood a realm.

**Bot state is a real, bounded store.** `StateHandler` (`bot_lib.py:41-66`) wraps
`BotStorageData`/`BotConfigData` (two models in `zerver/models/bots.py`, 80 lines total) with a
hard size cap: `storage_size_limit = settings.USER_STATE_SIZE_LIMIT`. A bot can remember things
between turns, but not unboundedly.

---

## §2.3 ★ The LLM integration: ONE feature, five fences

Measured across the tree: the only production LLM call is **`zerver/actions/message_summary.py`**
(215 lines, `from openai import OpenAI` at line 7). It implements **topic summarisation** — the
user asks for a summary of a conversation, the server sends the last ≤100 messages to an
OpenAI-compatible endpoint, and returns a rendered summary.

**What the code does, in order** (`message_summary.py`):

1. Reads a narrow (channel + topic), fetches **at most `MAX_MESSAGES_SUMMARIZED = 100` messages**
   (`:24`, `:106`).
2. **Formats them for the model** (`format_zulip_messages_for_model`, `:50-69`) — stripping the
   recipient, timestamps, reactions; sending only `{"sender": full_name, "content": text}` as
   JSON. The comment block at `:51-64` is a *list of deliberate omissions*.
3. Builds a **3-message chat** (`:163-167`): a `system` intro ("The following is a chat
   conversation in the Zulip team chat app." + channel/topic), the conversation as a `user`
   message, and a `user` instruction ("Succinctly summarize this conversation… up to N
   sentences… Refer to specific people as appropriate. Don't use an intro phrase.").
4. Calls the model with **operator-supplied credentials and parameters**:
   ```python
   client = OpenAI(
       api_key=settings.TOPIC_SUMMARIZATION_API_KEY,
       base_url=settings.TOPIC_SUMMARIZATION_API_BASE,
   )
   response = client.chat.completions.create(
       model=model,
       messages=messages,
       **settings.TOPIC_SUMMARIZATION_PARAMETERS,
   )
   ```
5. **Meters cost from the API's own token counts** (`:196-202`):
   ```python
   credits_used = (output_tokens * settings.OUTPUT_COST_PER_GIGATOKEN) + (
       input_tokens * settings.INPUT_COST_PER_GIGATOKEN
   )
   ```
   and writes it into a `LoggingCountStat` (`ai_credit_usage::day`).

### The five fences around the LLM (this is the finding)

| # | Fence | Where | What it guarantees |
|---|---|---|---|
| **F1** | **Server opt-in** | `TOPIC_SUMMARIZATION_MODEL` defaults to **`None`** (`default_settings.py:769`) | AI features **do not exist** unless the operator configures them. `events.py:582` broadcasts `server_can_summarize_topics` so clients can hide the button. |
| **F2** | **Per-realm permission** | `can_summarize_topics_group` (`realms.py:914`) — a `GroupPermissionSetting` defaulting to `SystemGroups.EVERYONE`, but settable to nobody / a chosen group | A realm admin controls *which members* may use AI. |
| **F3** | **Per-user monthly cost cap** | `MAX_PER_USER_MONTHLY_AI_COST` (default **`0.5`** USD, `default_settings.py:776`); enforced in the view (`message_summary.py:28-33`) | A user cannot spend unboundedly. |
| **F4** | **Provider-neutral, operator-chosen** | `TOPIC_SUMMARIZATION_API_BASE` + `API_KEY` from a **secret**, not hardcoded (`computed_settings.py:1329-1330`) | The operator decides *which* model and *whose* endpoint. Dev uses Groq (`llama-3.3-70b-versatile`); the prod template shows HuggingFace. |
| **F5** | **The result is rendered as untrusted Markdown** | `:214` — `markdown_convert(summary, message_realm=user_profile.realm)` | Model output goes through Zulip's **existing** Markdown sanitizer, exactly like a user message. The model is never trusted to produce safe HTML. |

**★ The measure of this design.** Zulip added an LLM and treated it as **a feature of the
product, fenced by the product's own primitives** — the same group-permission model, the same
Markdown pipeline, the same metering infrastructure that already existed for other stats. It
did **not** add an agent framework, a tool-call loop, or a memory system. **Where n8n's P1 was
"build the agent", Zulip's P1 is "admit the model, fence it with what you already have."**

---

## §2.4 What the P1 surface does NOT have (measured, so the negatives are as solid as the positives)

| Capability | Present? | Evidence |
|---|---|---|
| An **LLM call in the core** | ✅ **yes** — one, summarisation | `message_summary.py:7` |
| **Tool-calling / function-calling loop** | ❌ no | no `tools=` argument anywhere; grep of `tool_call` → 0 in `zerver/` |
| **A memory / context store for a model** | ❌ no (bots have a small KV store, not the model) | `BotStorageData` is per-*bot*, not per-*model* |
| **A vector store / embeddings / RAG** | ❌ no | no `embedding`, `vector`, `pgvector` in the tree |
| **Streaming responses to the client** | ❌ no (single blocking completion) | `client.chat.completions.create` — no `stream=True` |
| **Multi-turn agent conversation** | ❌ no (one-shot: messages in → summary out) | `do_summarize_narrow` is stateless per call |
| **Summarisation caching** | ❌ **no, and the code admits it** | `:94-97` TODO: *"does not attempt to make use of caching previous summaries… Doing so correctly will require careful work around invalidation"* |
| **A separate LLM for anything else** | ❌ no | only `TOPIC_SUMMARIZATION_*` exists |

**The most honest sentence in the batch** is the TODO at `:172-184`, which plans a *token
reservation* protocol:

> `# TODO when implementing user plans:` … *"These first two steps should be a short database
> transaction that locks the `LoggingCountStat` row… That way, you can't easily get extra tokens
> by sending 25 requests all at once when you're just below the limit."*

**This is an unimplemented race-condition fix, stated in the code.** The cost cap (F3) is checked
*before* the call but the *stat is incremented after* — so a burst of parallel requests can
overshoot the monthly cap. Zulip knows, named it, and left a plan. Per rule 10, that TODO is
more informative than the feature.

---

## §2.5 Where the old bot path is still the "generic" one

Two more seams complete the P1 picture, both predating the LLM:

- **Outgoing webhooks** (`zerver/lib/outgoing_webhook.py`, 432 lines). An abstract base
  `OutgoingWebhookServiceInterface` with two concrete implementations — a **generic** one and a
  **Slack-compatible** one (`GENERIC_INTERFACE`, `SLACK_INTERFACE`). The service POSTs the
  message to a URL and forwards the reply. **The endpoint can return a `widget_content`** field
  (`OutgoingWebhookResult`, `:28-32`) — **this is the bridge to batch 05: a bot can return
  widget data, not just text.**
- **Embedded bots run in a queue worker** (`zerver/worker/embedded_bots.py`, 61 lines) —
  `EmbeddedBotWorker(QueueProcessingWorker)`. **The bot's execution is async, off the request
  path**, exactly like email sending. There are exactly **6 embedded bots** (`integrations.py:478-484`):
  `converter`, `encrypt`, `helloworld`, `virtual_fs`, `giphy`, `followup`.

**Outgoing webhooks carry a token.** `OutgoingWebhookServiceInterface.__init__` takes a `token`
and sets a **User-Agent** (`ZulipOutgoingWebhook/` + version) — the call is authenticated
outbound, not open.

---

## §2.6 Divergences and honest limits (batch 02)

| # | Divergence / limit | Detail |
|---|---|---|
| **D2-1** | **An interface with two dead methods** | `EmbeddedBotHandler.react` returns `{}  # Not implemented`; `update_message` is `pass  # Not implemented`. They exist for interface-shape only — a reader could mistakenly believe embedded bots can react/edit. |
| **D2-2** | **The cost cap has a known race** | F3 is enforced pre-call, the stat is incremented post-call; a parallel burst can overshoot the monthly limit. The code says so (`:172-184`) but it is *not fixed*. |
| **D2-3** | **"Embedded bot" is a different product** | The handler imports `zulip_bots.lib` — the embedded-bot engine lives in a **separate repository/package**, not this tree. This study sees only the *host* side. |
| **D2-4** | **No streaming, no multi-turn, no tools** | The LLM surface is one-shot and blocking. Any claim of "Zulip has an agent" would be false. |
| **D2-5** | **The summariser sends conversation content to a third party** | F4 makes the *endpoint* operator-chosen, but the feature's contract is that message text leaves the server. There is no local-model path in this tree. |

---

## §2.7 Batch-02 verdict

Zulip's machine-participant model rests on **one insight**: *make the machine a user.* A bot is a
`UserProfile`; it is mentioned, DM'd, subscribed and permission-checked by the same code as a
human. On that base sit **four wiring types** (generic / incoming / outgoing / embedded), a
**deliberately narrow bot façade** that exposes seven operations and blocks the rest, and — new
in the 12.x line — **exactly one LLM feature**, topic summarisation, which is the textbook
example of *admitting a model without letting it become the architecture*: server-opt-in,
realm-permissioned, per-user cost-capped, provider-neutral, and its output sanitised by the
platform's own Markdown pipeline.

**The two things to carry forward:** (1) the **bot-as-user** primitive — the machine needs no
new core object; and (2) the **five-fence pattern** for an LLM feature, which is the most
transferable P1 mechanism Zulip has, precisely because it is *smaller* than the agent frameworks
other platforms built.

---

*Batch 02 · Zulip · a bot is a user · a narrow façade · one LLM feature, five fences ·
the cost race is named, not fixed.*
