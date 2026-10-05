# 04 — Paperclip: meetings, channels and multi-agent collaboration

**Batch 04 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch reads **upstream Paperclip** at `library/ai/paperclip-master/` only. I read
`doc/CHANNELS.md`, `doc/AGENT-ARTIFACTS.md`, `doc/agent-files.md`,
`doc/connection-intents.md`, `doc/connections/` (listed; read `README.md`,
`CHAT-CONNECTOR-UX.md`, `FIREFLIES.md`), `doc/plans/` (listed; read the agent-chat,
chat-provider-foundation, chat-completion-updates and chat-adapters-architecture
plans), `packages/plugins/` (listed), `packages/adapters/` (listed), the Drizzle
schema in `packages/db/src/schema/`, and grepped the repository for `conversation`,
`meeting` and `channel`. Where a document and the code disagree I say so and trust
the code.

The headline is that Paperclip has **no meeting, room or channel entity**. It has
*two* conversation mechanisms — an experimental **internal Agent Chat** and an
**external chat-adapter** subsystem — and both are thin presentation layers over the
one durable object Paperclip already had: the **issue**.

---

## 1. How is a shared conversation modelled?

There is no single "conversation" object. There are two, and neither is a meeting,
room or channel.

### 1a. Internal Agent Chat is an issue

The design is explicit that chat is a *mode over an issue*, not a second messaging
product: "Each person has one persistent conversation with each agent in a company.
A conversation is an ordinary issue with fixed `conversationAgentId` and
`conversationUserId`, a matching agent assignee, and a unique company/agent/user
identity" (`doc/plans/2026-09-10-agent-chat.md:8`). The earlier decision plan had
already rejected a separate chat object for V1 and chose "Every chat is an issue"
(`doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md:94-110`).

The code matches. The `issues` table carries conversation columns directly
(`packages/db/src/schema/issues.ts:32-36`):

| Column | Meaning |
| --- | --- |
| `conversation_agent_id` | the agent this conversation is with |
| `conversation_user_id` | the one person who owns it |
| `conversation_state` | `active` or `waiting` |
| `conversation_session_generation` | session counter, bumped by `/new` |
| `conversation_boundary_comment_id` | the `/new` comment that started the current session |

A database check constraint enforces the shape: either all conversation columns are
null, or the agent and user are both set, the assignee equals the conversation
agent, there is no assignee user, and the state is `active`/`waiting`
(`packages/db/src/schema/issues.ts:96-104`). A unique index makes the
(company, agent, user) triple unique — one conversation per person per agent
(`packages/db/src/schema/issues.ts:95`). The code-level test for "is this an issue a
conversation?" is simply both columns set (`server/src/services/agent-conversations.ts:27-31`).

Conversations are created lazily on first send, not on open: `GET` on
`/companies/:companyId/chats/:agentRef` is read-only, and `POST` creates the issue
with `conversationAgentId`, `conversationUserId`, `conversationState: "waiting"`,
`status: "in_review"` (`server/src/routes/issues.ts:17274-17297`). The whole feature
is behind `enableAgentChat`, which defaults to false (`doc/plans/2026-09-10-agent-chat.md:34`).

### 1b. External chat is endpoint + conversation tables

The second system exposes an agent through a real chat provider (Slack, GitHub,
Discord, Microsoft Teams, Telegram, AgentMail, iMessage Photon — the full enum is
`packages/db/src/schema/chat_channels.ts:118-121`). It is designed as *transport*,
with Paperclip still authoritative: "External chat is transport and presentation.
Paperclip remains authoritative for agents, tasks, runs, permissions, approvals,
budgets, artifacts, liveness, and audit history"
(`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:11`).

The real table names (all in `packages/db/src/schema/chat_channels.ts`):

| Table | Role | Citation |
| --- | --- | --- |
| `chat_endpoints` | one live bot/connection per agent; assigned agent immutable | `chat_channels.ts:37-202` |
| `chat_endpoint_resources` | provider-side channels/repos/topics, enablement | `chat_channels.ts:203-257` |
| `chat_external_principals` | normalised external users/bots | `chat_channels.ts:259-303` |
| `chat_identity_links` | external principal ↔ Paperclip user | `chat_channels.ts:305-357` |
| `chat_conversations` | **external thread → one Paperclip issue** | `chat_channels.ts:359-425` |
| `chat_deliveries` | durable inbound event ledger | `chat_channels.ts:427-505` |
| `chat_publications` | durable outbound outbox | `chat_channels.ts:507-578` |
| `chat_message_links` | provider message id ↔ comment | `chat_channels.ts:580-641` |
| `chat_actions` | button/modal/command callbacks | `chat_channels.ts:643-700` |
| `chat_agent_routes` | agent-to-agent directed routes | `chat_channels.ts:702-742` |
| `chat_endpoint_leases` | fencing leases | `chat_channels.ts:744-774` |
| `chat_sdk_state` | endpoint-scoped SDK state | `chat_channels.ts:776-804` |

Crucially, `chat_conversations.issue_id` is `notNull` and references `issues`
(`packages/db/src/schema/chat_channels.ts:370-372`). So even an external Slack thread
is, underneath, an issue. The architecture states the binding rule: "One bot-owned
external thread maps to exactly one Paperclip issue for that endpoint"
(`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:23`), and the
task-facing summary is derived from these rows
(`server/src/services/chat-channel-binding.ts:16-75`).

### 1c. Who can post

**Internal Agent Chat** — only the owning person and the assigned agent. The comment
route rejects any other board user: "Only the conversation owner can send messages or
start a new session" (`server/src/routes/issues.ts:17315`). The plan is careful that
this is *not* a private message: conversations have "ordinary company visibility"
(`doc/plans/2026-09-10-agent-chat.md:8`) and SPEC says they have "ordinary company
visibility" too (`doc/SPEC.md:302`).

**External chat** — external people post as principals. A linked principal acts with
their current Paperclip permissions; an unlinked person acts only through a fixed
"restricted external profile" and cannot govern, spend, approve or reassign
(`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:311-317`). The
endpoint's assigned agent is locked for the life of the external task
(`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:27`).

### 1d. No meeting

I grepped the whole repository for `meeting`. Every hit is either a *connector that
ingests meeting data* (Fireflies: `doc/connections/FIREFLIES.md:5-23`), a Fireflies
webhook service (`server/src/services/fireflies-webhook.ts`), or an unrelated
Storybook prototype. There is **no meeting, room or calendar entity** in the schema.
Meetings are an external data source, not a collaboration surface.

> ⚠️ Doc/code mismatch worth flagging: `doc/CHANNELS.md` is *not* about chat
> channels. It documents the four **release channels** (`stable`, `beta`, `nightly`,
> `canary`) for shipping Paperclip itself (`doc/CHANNELS.md:1-12`). Anyone sent there
> looking for the channel model will be misled.

---

## 2. How is an agent called into a conversation?

Everything routes through one table, `agent_wakeup_requests`
(`packages/db/src/schema/agent_wakeup_requests.ts:15-92`). It records `source`
(`timer | assignment | on_demand | automation`), `triggerDetail`
(`manual | ping | callback | system`), a `reason`, a JSON `payload`, and an
`idempotencyKey` (`server/src/services/issue-assignment-wakeup.ts:4-5`). Execution is
the existing heartbeat: the wake is enqueued, coalesced, and dispatched to the
agent's adapter.

**Internal Agent Chat — a comment, not a mention.** A user message is a comment on
the conversation issue. Comment creation wakes the **assignee agent** with reason
`issue_commented` (`server/src/routes/issues.ts:14713-14776`), and for a conversation
the assignee *is* the conversation agent (enforced by the check constraint,
`issues.ts:100`). There is no `@mention` for agents inside Paperclip: grepping the
issue service for "mention" finds only project-reference parsing
(`server/src/services/issues.ts:13188-13225`). The conversation's own durable outbox
re-enqueues any comment whose wake was lost, with reason `issue_commented` and key
`conversation-comment:<id>` (`server/src/services/agent-conversations.ts:471-576`).

Self-comments do not wake the agent (`server/src/services/issue-comment-wakeup.ts:18-27`),
so an agent replying in its own thread does not trigger itself. Assignment also wakes
the assignee (`server/src/services/issue-assignment-wakeup.ts:43-77`).

**External chat — a native @mention activates; replies continue.** The design is
capability-driven: a root-level mention of the bot "creates or opens a native thread,
creates exactly one Paperclip issue for its endpoint, and moves the conversation into
that thread", after which "every eligible human message delivered from that provider
thread continues the same Paperclip issue" without another mention
(`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:17,23-24`). Fresh
unaddressed root messages are ignored (`...architecture.md:24`). The inbound wake
carries reason `issue_commented` with `source: chat:<provider>`
(`server/src/services/chat-channels.ts:20006-20048`), so it flows into the same
heartbeat path as an internal comment.

**Schedules** exist too — `agent_wakeup_requests.source` includes `timer` and
`on_demand` (`issue-assignment-wakeup.ts:5`), and routines/webhooks wake agents — but
within a conversation the trigger is always "a new message arrived", not a schedule.

---

## 3. Can agents hand work to each other?

Yes — but only as **task assignment**, never as peer-to-peer messaging.

**The mechanism is delegation by creating an assigned task.** SPEC states it
plainly: "The CEO delegates by creating tasks assigned to the CTO; the CTO breaks
those down into sub-tasks assigned to engineers; discussion happens in task comments,
not a side channel; if an agent needs to escalate, they comment on the parent task or
reassign" (`doc/SPEC.md:316-320`). The runtime tool is `create_task`, whose
`assigneeActorId` argument becomes `assigneeAgentId`, defaulting to the calling agent
(`server/src/services/project-tools.ts:33-44`). The Agent Chat directive instructs the
agent to "Create ordinary assigned tasks, never subtasks of this conversation… with
… appropriate assignee" (`server/src/services/agent-conversations.ts:94`).

**Its limits.** Assignment is permissioned: a low-trust agent's attempt to assign to
another agent is rejected as "outside boundary" (`server/src/__tests__/chat-project-tools.test.ts:149-150`),
and SPEC says low-trust agents may only create self-assigned tasks "subject to
assignment permissions and the responsible user's authority"
(`doc/SPEC.md:293-297`). Paperclip is also single-assignee per task and "does not
auto-reassign work" (`doc/SPEC.md:581,594`).

**Structured hand-offs to a specific agent.** Beyond plain tasks, a thread can carry
typed interactions (questions, confirmations) with an explicit addressee:
`issue_thread_interactions.addressee_agent_id` and `addressee_user_id`
(`packages/db/src/schema/issue_thread_interactions.ts:49-50`). Resolving one wakes the
assignee with reason `issue_commented` and `mutation: "interaction"`
(`server/src/routes/issues.ts:2717-2745`).

**Returning completed work.** When a conversation hands off a task, Paperclip records
the link in `chat_task_handoffs` (task, source conversation, agent, session
generation) and, on Done, queues a `chat_completion_deliveries` outbox row so the
original agent writes an unsolicited update back into the conversation
(`packages/db/src/schema/chat_completion_deliveries.ts:8-34`;
`doc/plans/2026-09-28-chat-completion-updates.md:15-37`). The plan is explicit that
this applies to Agent Chat handoffs, "not all agent handoffs in general"
(`doc/plans/2026-09-28-chat-completion-updates.md:11`).

**Agent-to-agent *between external bots* is designed but not built.** `chat_agent_routes`
exists as a table — directed source→destination endpoints, `trigger_mode` defaulting
to `explicit_mention`, `max_hops` bounded 1–8, self/cross-company routes rejected by
construction (`packages/db/src/schema/chat_channels.ts:702-742`). The architecture
lists it as a late delivery phase ("Agent routes: directed allowlists, causal stamps,
loop/hop protection") and says "External agent-to-agent turns are disabled by
default" (`doc/plans/chat-adapters/2026-09-03-chat-adapters-architecture.md:32,367`).
But I found **no service or route code that reads or writes `chat_agent_routes`**:
excluding migrations, the only references are its schema definition and the schema
barrel export (`packages/db/src/schema/index.ts:61`). In this version it is a
schema-only stub.

**Plugins can orchestrate.** The first-party example plugin creates child issues
assigned to an agent, with blocker relations and wakeups
(`packages/plugins/examples/plugin-orchestration-smoke-example/README.md:11-16`), so
plugin code is a third, host-level route for cross-agent work. The other plugins
(`plugin-llm-wiki`, `plugin-workspace-diff`, sandbox providers) are not collaboration
mechanisms.

---

## 4. How is a shared thread stored and replayed?

**There is one canonical shared record, and per-agent views are derived from it.**

The canonical record is the pair **(issue, comments)**: each message is one
append-only `issue_comments` row keyed to the issue
(`packages/db/src/schema/issue_comments.ts:15-65`), with author columns for agent,
user, "on behalf of", the creating run, and an idempotency column
`client_request_id` (unique per issue+user, `issue_comments.ts:48`). For external
chat, `chat_deliveries` is the durable inbound ledger and `chat_publications` the
outbound outbox, with `chat_message_links` mapping provider message ids back to
comments (`packages/db/src/schema/chat_channels.ts:427-641`). So there is exactly one
shared transcript; provider ids are cross-references, not a second store.

**Per-agent replay is bounded and sanitised.** When a fresh provider session starts,
`conversationReplay` rebuilds context from comments only — the **last 40**, each body
truncated to **8,000 characters**, ordered oldest-first, and passed through
`sanitizeQuarantinedCommentForHigherTrust` (`server/src/services/agent-conversations.ts:408-468`).
Provider session state itself lives in `agent_task_sessions`, unique per
(company, agent, adapter, taskKey) (`packages/db/src/schema/agent_task_sessions.ts:16-57`),
so each agent has its own session pointer over the shared thread.

**Session boundaries are first-class.** `/new` is a command comment that increments
`conversationSessionGeneration`, records `conversationBoundaryCommentId`, deletes the
matching agent/task provider session, expires pending questions, and makes replay read
only comments *after* the boundary (`server/src/services/agent-conversations.ts:152-210`).
The generation is stamped on runs and comments so a cancelled or superseded turn
"cannot issue mutating API calls, post late replies, or restore provider sessions"
(`doc/plans/2026-09-10-agent-chat.md:20`). So the shared history is permanent, while
what any given agent turn *sees* is a fenced, bounded window.

---

## 5. What is an "agent artifact" and how does it relate to collaboration?

`doc/AGENT-ARTIFACTS.md` defines an artifact as a **generated deliverable file a board
user or reviewer must inspect**, which "must be attached to the Paperclip issue before
the agent chooses a final disposition. A local workspace path is not enough, because
cloud users and reviewers often cannot access the agent's disk"
(`doc/AGENT-ARTIFACTS.md:3-6`). Two delivery forms exist:

- **Uploaded artifact** — registered via `register_deliverable` or the upload helper,
  producing an attachment plus an **artifact work product** with `type: "artifact"`,
  `provider: "paperclip"` (`doc/AGENT-ARTIFACTS.md:8-22,59-66`).
- **Workspace file reference** — a `workspace_file` work-product reference for files
  that intentionally stay in the checkout (`doc/AGENT-ARTIFACTS.md:67-91`).

The backing table is `issue_work_products`, which is issue-scoped and carries `type`,
`provider`, `url`, `reviewState`, `isPrimary`, and `sourceTrust`
(`packages/db/src/schema/issue_work_products.ts:18-44`).

**Relation to collaboration.** An artifact is not a conversation primitive; it is how
one agent's output becomes inspectable by a *human or another agent* without sharing a
disk. That is why the docs insist the final comment must "name and link the uploaded
artifact or work product, not just the local filesystem path"
(`doc/AGENT-ARTIFACTS.md:116-121`), and why a file intended for an external chat must
be explicitly bound with `--attachment-id` so "Paperclip binds only those exact
uploaded files to that comment; other task attachments remain internal"
(`doc/AGENT-ARTIFACTS.md:111-114`). In a task-based collaboration model, the artifact
is the shared hand-off object; there is no separate "files in a room" concept.

---

## 6. What should we learn for our platform?

**Good — borrow these**

- **One durable work object under every conversation.** Both chat systems are
  presentation over the issue, so billing, permissions, approvals, runs, artifacts and
  audit come for free (`doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md:94-110,191-203`).
  For a company OS this is a strong, honest default: a conversation that matters
  *is* a durable, auditable object.
- **A single wakeup table with typed source/reason and idempotency keys**
  (`packages/db/src/schema/agent_wakeup_requests.ts:15-92`) is a clean way to make
  "who woke this agent, and why" answerable, and to survive retries without double
  execution.
- **Explicit, durable hand-off records with completion callbacks.** `chat_task_handoffs`
  + `chat_completion_deliveries` (schema at `chat_completion_deliveries.ts:8-34`) mean
  a delegated task reports back to its originator automatically, with session-generation
  fencing so a `/new` cannot resurrect a stale reply.
- **Artifacts as first-class, issue-bound deliverables** (`issue_work_products.ts:18-44`)
  rather than paths on someone's disk is exactly right for humans and agents sharing
  work.
- **Design documents that name their invariants and threats** (the chat-adapters
  architecture's "product invariants" list, `...architecture.md:19-34`) are unusually
  good engineering hygiene; several encode safety properties (default-deny agent
  routes, single-agent-per-endpoint) we should copy as written rules.

**Weak — be critical**

- **Two overlapping conversation systems.** Internal Agent Chat and the external
  chat-adapter tables solve the same problem twice with different vocabularies
  (`conversation_agent_id` on issues vs. `chat_conversations`). A newcomer cannot tell
  from the names which one a given feature uses; we should pick one mental model.
- **Naming is actively misleading.** `doc/CHANNELS.md` is about release channels, not
  chat channels (`doc/CHANNELS.md:1-12`), and `chat_agent_routes` is a *schema-only*
  stub for agent-to-agent routing with no runtime code. Both cost reader trust.
- **No meetings / no multi-party shared space.** Every "conversation" is either 1:1
  (person↔agent) or one external thread↔one issue. There is no room where several
  humans and several agents participate as equals. For our "AI employees in shared
  spaces" goal this is a real gap: Paperclip's answer is "use one task and comment on
  it", which does not give a meeting its own identity, agenda, turn-taking or
  participant roster.
- **No agent @mention inside the platform.** Waking is by assignment or by commenting
  on an assigned task (`server/src/services/issue-comment-wakeup.ts`; SPEC
  `doc/SPEC.md:314`). To bring a *specific* agent into a thread you must assign it a
  task; you cannot simply mention it in a shared thread. That limits ad-hoc
  multi-agent collaboration.
- **Heavyweight, race-hardened machinery for what is conceptually simple.** The
  conversation layer carries generations, boundaries, durable outboxes, idempotency
  keys, and cancellation fences (`agent-conversations.ts:118-576`). That rigor is
  earned at scale, but it is a large surface we should not copy wholesale before we
  have the load that justifies it.
- **Agent-to-agent routing is promised in prose but absent in code.** Invariant 12
  reads as a feature (`...architecture.md:32`); the table exists but nothing uses it.
  We should treat "agent routes" as unproven and design our own hand-off model
  deliberately.

**What we would do differently**

- Model a **shared space as a first-class entity** (a "meeting"/"room" with its own id,
  participants, agenda and lifecycle) that can *contain* tasks — rather than forcing
  every collaboration to be a 1:1 conversation or a single thread. Paperclip has no
  such object; that is our opportunity.
- Give **agents a real mention/participant concept** so they can be pulled into a
  shared thread without a full assignment, with the same permission gates Paperclip
  applies to assignment (`doc/SPEC.md:293-297`).
- Keep Paperclip's two best ideas — **the durable work object as the source of truth**
  and **a typed, idempotent wakeup table** — but unify the vocabulary so internal and
  external conversations are visibly the same model.

---

## What I could not verify

- **Whether `chat_agent_routes` is wired anywhere at runtime.** I grepped the
  repository and found only its schema definition, the schema barrel export, and the
  creating migration (`packages/db/src/schema/chat_channels.ts:702-742`,
  `packages/db/src/schema/index.ts:61`, `packages/db/src/migrations/0255_previous_captain_america.sql`).
  I did not read every route/UI file, so I cannot fully exclude a consumer, but I found
  none.
- **Live behaviour.** I read source and docs only. The agent-chat plan reports 24/24
  paid runner cells passing and E2E browser coverage
  (`doc/plans/2026-09-10-agent-chat.md:270-296`), but I did not run Paperclip, so all
  runtime claims here are read from the code and the maintainers' own reports.
- **The full external-chat service surface.** `server/src/services/chat-channels.ts`
  is very large; I verified the schema, the binding service, and the inbound wake path,
  but I did not read every provider adapter, so provider-specific mention/thread
  nuances are taken from the architecture document rather than confirmed line by line.
- **`doc/DATABASE.md` and other table inventories** that might describe conversation
  tables; I relied on the Drizzle schema as the authority instead, per the rule to
  trust code over docs.
- **The sibling Hermes fork.** I deliberately did not read
  `library/ai/hermes-docs/reboot/`; any resemblance to that analysis is coincidental.
