# SRS-04 — Threads and Collaboration

**Batch B6 of the workspace-architecture workstream.**
Answers the owner's **Q6** ("how do we save different threads of that workspace") and **Q7** ("collaborate in
one — as human users, or human and AI users").

**Status:** first draft complete; every code claim carries the file and line it was read from (rule 0 — only
the code is evidence). It has **not** yet been through its hostile-critic round; the round and its corrections
are recorded in §9 when it runs.

**Provable sources read for this batch** (all in `workspace/starting-kit` unless stated):
- `packages/ai-assistant/src/modules/ai_assistant/data/entities.ts` — `AiChatConversation` (`:717`),
  `AiChatConversationParticipant` (`:806`), `AiChatMessage` (`:880`), `AiAgentBinding` (`:989`).
- `packages/ai-assistant/src/modules/ai_assistant/data/repositories/AiChatConversationRepository.ts` — the
  whole store: `createOrGet` (`:135`), `list` (`:214`), `getTranscript` (`:378`), `listParticipants` (`:575`),
  `addParticipant` (`:606`), `revokeParticipant` (`:668`), `getParticipantCount` (`:721`), and the access
  helper `findOneAccessibleConversation` (`:805`); the access context (`:35-40`).
- The conversation API routes: `api/ai/conversations/route.ts`, `.../import/route.ts`,
  `.../[conversationId]/route.ts`, `.../[conversationId]/participants/route.ts`,
  `.../participants/[userId]/route.ts`.
- The frontend: `packages/ai-assistant/src/frontend/components/DockableChat/DockableChat.tsx` (16,698 bytes),
  `modules/ai_assistant/components/ConversationShareDialog.tsx`, `ConversationShareButton.tsx`,
  `widgets/notifications/ConversationSharedRenderer.tsx`.
- `packages/core/src/modules/messages/` — the separate **message/notification** module (`data/entities.ts`:
  `Message`, `MessageRecipient`, `MessageObject`, `MessageAccessToken`, `MessageConfirmation`).
- The vision analysis: `library/analysis/findings/04-vision-workspace.md` §12 (collaboration, Parts XI–XIII,
  XXIII–XXIV) and §13 (AI generation, Parts XVII–XXXI).
- The vision itself: `library/ai/ai-first/05_Widgetized_Collaborative_Workspace_Architecture.md`.

**Measured test runs this batch** (run, not inherited — rule 0b):
- `AiChatConversationRepository.test.ts` — **36 passing** (1 suite).
- `api/ai/conversations/__tests__/route.test.ts` — **2 passing** (1 suite).

---

## §0 — The answer in one paragraph

**The owner's Q6 is already built, and the human half of Q7 is already built — but the thread the kit saves is
an *AI chat thread*, and the vision's thread is a *workspace* that holds widgets, objects and both humans and
AI as equal participants.** The kit has a complete, tested, persisted conversation stack: `ai_chat_conversations`
(a thread with `title`, `status`, `visibility ∈ {private, shared, organization}`, `pageContext`, `lastMessageAt`),
`ai_chat_conversation_participants` (**the human-sharing model**: `role ∈ {owner, viewer, commenter}`,
`lastReadAt`), and `ai_chat_messages` (append-only, `role ∈ {user, assistant, system}`, with `uiParts` that
render record cards). So: **saving threads = done** (`createOrGet`/`list`/`getTranscript`); **humans
collaborating = done** (add participant, private→shared visibility, a share dialog and a notification
renderer — 36 + 2 tests passing). **The gaps are three, and §4 names each** — the kit models "an AI chat" where
the vision models "a shared workspace": **Gap 1** — the **AI is an attribute of the thread** (`agent_id` — one
agent per conversation), **not a participant** alongside the humans, so "human **and** AI in one thread" is not
yet expressible as one participants list; **Gap 2** — the thread **holds messages, not widgets/objects** — there
is a `pageContext` blob but no first-class "this thread contains these placed Widgets, anchored to these
objects"; **Gap 3** — anchoring, presence and the feed (comment anchors, live presence, a human activity view)
are not built. The vision's hardest rule — **collaborative state vs business state** (§58: *"do not use generic
collaborative merging as the authority for financial/operational state"*) — is **satisfied by construction**
today, because the thread layer **cannot** write business data at all: business change goes through the
Business Command path (the write path B1/B4 documented), never through a thread. That separation is the single
most important thing to **keep**, and §6 states how. **There is no CRDT/real-time presence layer in the kit**
(measured: no WebSocket/Yjs/socket.io in production), which is correct for now — the vision's own §59 assigns
CRDT only to *documents, notes, layout, annotations, comments*, and assigns *invoices, inventory, payments,
purchase orders* to **transactional concurrency**, which is what the platform already does.

---

## §1 — The owner's two questions, decomposed

**Q6** — *"how do we save different threads of that workspace"*.

| # | Sub-question | Where it lands |
|---|---|---|
| C1 | Is there a persisted thread object at all? | §2a (`AiChatConversation`) |
| C2 | Can a person have several threads, list them, reopen them? | §2a (`list`, `createOrGet`, `transcript`) |
| C3 | What does a thread hold? | §2a (`AiChatMessage` + `uiParts`) |
| C4 | Does a thread remember *where* it was used (page/object)? | §2a (`pageContext`), §5 (the gap: no widget/object membership) |

**Q7** — *"collaborate in one — as human users or human and ai users"*.

| # | Sub-question | Where it lands |
|---|---|---|
| C5 | Can several humans share one thread? | §2b (`participants`, `visibility`, share dialog) |
| C6 | What may a non-owner do? | §2b (`role ∈ owner/viewer/commenter`) |
| C7 | Is the AI a participant too? | §3 (the gap: AI is `agent_id`, not a participant) |
| C8 | How is concurrent editing handled? | §6 (collaborative vs business state; no CRDT yet) |
| C9 | Is there live presence? | §6 (none in the kit; the vision's §55 says presence ≠ authorization) |

---

## §2 — The measurements this batch rests on

### 2a. The kit **already persists threads** (Q6 — C1, C2, C3, C4)

`data/entities.ts:717` — **`AiChatConversation`** (table `ai_chat_conversations`):

| Field | Meaning | Line |
|---|---|---|
| `id` (uuid PK) | the durable row | `:749` |
| `tenantId`, `organizationId` | scope, every read/write bounded by it | `:752`, `:755` |
| `conversationId` (text) | the **stable public identity** of the thread (unique per tenant+org) | `:758` |
| `agentId` (text) | **which AI agent this thread talks to** — one per conversation | `:761` |
| `ownerUserId` (uuid) | who created/owns it | `:764` |
| `title` (nullable) | the human name a thread gets | `:767` |
| `status` | `'open' | 'closed'` | `:770` |
| `visibility` | `'private' | 'shared' | 'organization'` | `:773` |
| `pageContext` (jsonb) | where in the app the thread was started | `:776` |
| `lastMessageAt` | ordering / "recent threads" | `:779` |
| `importedFromLocalAt` | threads imported from the pre-server localStorage era | `:782` |

**So a thread is: identified, owned, titled, scoped, listed, and closable.** The repository
(`AiChatConversationRepository.ts`) provides `createOrGet` (`:135` — requires `agentId`, `:140`), `list`
(`:214`, owner-scoped unless the caller holds `ai_assistant.conversations.manage`), and `getTranscript`
(paged, `:378`; its options/result contract is at `:68-78`). **C1, C2 answered: BUILT.**

`data/entities.ts:880` — **`AiChatMessage`** (append-only):

- `role ∈ {'user' | 'assistant' | 'system'}` (`:928`), `content` (`:931`);
- **`uiParts` (jsonb, `:934`)** — *"the serializable subset of `AiChatMessageUiPart[]` so the chat surface can
  re-render record cards, mutation-preview cards, etc. across reloads"* (`:875-877`). **This is the hook by
  which a thread can display structured results, not just text** — i.e. exactly the place a **placed Widget's
  result** would be rendered inside a thread;
- `clientMessageId` (`:925`) — the idempotency key for retries and lazy imports (partial unique index);
- `attachmentIds`, `filesMetadata`, `model`, `metadata`, `createdByUserId`.

**C3 answered: BUILT** (a thread holds ordered, re-renderable messages, and can already hold structured
`uiParts`). **C4 half-answered:** `pageContext` records where a thread started, but there is **no first-class
"these Widgets/objects are in this thread"** — see §5.

### 2b. The kit **already models human sharing** (Q7 — C5, C6)

`data/entities.ts:806` — **`AiChatConversationParticipant`** (`ai_chat_conversation_participants`):

- membership row per `(tenant, org, conversationId, userId)` (unique when org present, `:808`);
- **`role ∈ {'owner' | 'viewer' | 'commenter'}`** (`:850-851`) — the vision's collaboration levels in code;
- `lastReadAt` (`:853`) — reserved for unread/share UX (`:804` explicitly says so);
- soft-delete via `deletedAt` (`:856`).

The doc-comment (`:795-804`) states the model precisely: *"MVP always writes exactly one row per conversation
with `role = 'owner'` … Sharing extensions append additional rows with `role IN ('viewer', 'commenter', …)`.
The access predicate is 'is the caller an undeleted participant'."* The predicate itself is
`findOneAccessibleConversation` (`:805`) — *"is the caller an undeleted participant"* (owner-scoped unless the
caller holds a manager feature).

And the repository implements the sharing flow:
- `addParticipant` (`:606`) — adds a `viewer`/`commenter`, and **transitions `visibility` private→shared**
  (`:647-648`, `:660-661`); refuses a duplicate (`AiChatConversationDuplicateParticipantError`, `:105`);
- `revokeParticipant` (`:668`) — revokes (sets `deletedAt`, `:705`), and **falls back to `private`** when the
  last non-owner leaves (`:711-714`);
- `listParticipants` (`:575`) and `getParticipantCount` (`:721`) — the read side of participation.

The frontend is present too: `ConversationShareDialog.tsx`, `ConversationShareButton.tsx`,
`ConversationSharedRenderer.tsx`, plus the API routes
`api/ai/conversations/[conversationId]/participants/route.ts` and `.../participants/[userId]/route.ts`.
Integration specs exist: `TC-AI-CONVERSATIONS-001`, **`TC-AI-PARTICIPANTS-002`**, `TC-AI-sharing-06-deep-link`,
`TC-AI-sharing-07-owner-label`.

**C5, C6 answered: BUILT.** Measured: the conversation repository suite is **36 passing**, the conversations
route suite **2 passing**.

### 2c. The AI is **not** a participant — it is the thread's *agent* (Q7 — C7, the first gap)

Measured: `AiChatConversation.agentId` (`:761`) is a **column on the conversation**, and participants are
`s.userId` — a **human** `users` id. There is **no participant row whose actor is the AI**. The AI acts on the
thread *as the thread's agent* (`agentId`), and its turns are written as `role = 'assistant'` messages
(`:928`).

**What this means:** the kit expresses *"a human is chatting with an AI agent"*, and *"other humans may
watch/comment"*. It does **not** yet express *"this thread has several participants, one of whom is an AI"* —
which is the vision's §54 (`@Sarah`, `@John`, `@ProcurementAgent` in one workspace). **C7: GAP (small, but a
model change).** See §4.

### 2d. There is a **separate** message/notification module — and it is **not** the thread layer

`packages/core/src/modules/messages/data/entities.ts` defines `Message` (`:38`), `MessageRecipient` (`:147`),
`MessageObject` (`:197`), `MessageAccessToken` (`:234`), `MessageConfirmation` (`:265`). This is a
**notification / messaging** system (the platform telling a user something, with tokens and confirmations),
distinct from the AI conversation thread. `message-objects.ts` — the "anchor to a business object" registry —
**is an empty array today** (`export const messageObjectTypes = []`). **Record it, do not conflate it:** the
owner's "thread" is the `ai_chat_*` family, not `messages`. (This is the same word-collision hazard the recon
flagged for "widget"; here it is "message".)

### 2e. There is **no** real-time/presence/CRDT layer (Q7 — C8, C9)

Measured: no `WebSocket`, `socket.io`, `Yjs`, or `crdt` in **production** code (the few hits are a `metadata`
key and test files). **C9: no presence layer exists.** **C8: concurrency today is the platform's ordinary
transactional one** (optimistic locking on writes — the same mechanism the kit uses everywhere).

**This is aligned with the vision, not contrary to it.** §59 of the analysis splits synchronisation into two
classes: **CRDT/OT** for *documents, notes, layout, annotations, comments*, and **transactional concurrency**
for *invoices, inventory, payments, purchase orders*. The kit has the second (correctly) and none of the first
(because it has no collaborative *document* surface yet).

---

## §3 — What the vision asks for (Parts XI–XIII, from analysis §12)

Quoted from `library/analysis/findings/04-vision-workspace.md` §12 (measured):

1. **Three collaboration levels** (§53): workspace-wide, around one Widget, and on a specific object.
2. **Human + AI participants** (§54): `@Sarah`, `@John`, `@ProcurementAgent` in one workspace.
3. **Presence** (§55) is a *collaboration* feature, **not** business authorization.
4. **Comments are anchorable** (§56) to widget / row / cell / chart point / form field / paragraph / message /
   Function / workflow step / business record.
5. **Collaborative state vs business state** (§58) — **the critical separation.**
6. **Two synchronisation classes** (§59) — CRDT for docs/notes/layout/annotations/comments; transactional for
   business records.
7. **No last-write-wins for business data** (§60).
8. **Activity vs audit are distinct** (§103–105) — the feed is human-friendly; the audit trail is the record.

---

## §4 — The gaps, precisely (and how small they are)

### Gap 1 — the AI is not a participant (C7)

**What it is, in our terms.** A thread's AI is `AiChatConversation.agentId`; humans are
`AiChatConversationParticipant` rows. So a thread can have *one agent* and *many humans*, but the two live on
different axes.

**Why it matters.** "Human **and** AI in one thread" (the owner's words) means the AI should be *a participant*
— one entry in a participants list, addressable, mentionable, with its own role. Today the UI can say "you are
talking to Agent X and Sarah is watching"; it cannot say "this thread's participants are Sarah, John and Agent
X, all peers".

**Options (ranked; recommendation first):**
1. **Add an actor-kind to participation (recommended).** Introduce a participant actor that can be a `user`
   **or** an `agent` (a `actorKind` + `actorId`, or a second table `ai_chat_conversation_agent_participants`).
   Keep `agentId` as *"the default agent this thread was opened with"* for back-compat. **Cost:** one
   migration + repository change; the existing 36 tests keep passing because the human path is untouched.
2. **Replace `agentId` with a participant row** (a bigger change; breaks the MVP invariant `createOrGet
   requires agentId`). **Not recommended** — churn for little gain now.
3. **Leave it, and model "human+AI" only as messages.** Cheapest, but it does not answer the owner's question
   at the model level.

### Gap 2 — a thread holds messages, not Widgets/objects (C4)

**What it is, in our terms.** `AiChatMessage.uiParts` can *render* a card (including a placed Widget's result),
but the thread does not **own** a set of placed Widgets, and does not **anchor** comments to objects.

**Why it matters.** The vision's workspace "contains widgets"; the kit's thread "contains messages that may
render a card". For the workspace surface (B9), we will want *"this workspace has these Widgets placed at
these slots, and this discussion is anchored here"*.

**Recommendation.** Do **not** invent a second container. `BusinessWidget` + the registry (§112–114, B5 §2f)
already give a Widget identity, and an **instance** already carries `{host, slot}`. So a "thread's contents"
is best modelled as the **instance list for that host** (the thread *is* a host), plus **anchors** stored on
the message (`uiParts`/`metadata`) pointing at `{objectType, objectId, field?}`. That reuses the registry
rather than adding a parallel tree.

### Gap 3 — anchoring, presence, and the feed (C4/C9; §56, §55, §103–105)

- **Anchoring (§56):** partly available — `pageContext` records the page; `metadata` on a message can carry an
  anchor. What is missing is a **typed anchor** (`objectType`/`objectId`/`field`) and the resolution that
  checks the viewer's access (vision §176: *the reference is not authorization*).
- **Presence (§55):** not built. **Recommendation:** treat as a **non-core, later** feature — and never let it
  imply authorization (the vision is explicit).
- **Activity vs audit (§103–105):** the kit has an **audit log** (the platform's own) and the thread's
  **messages** — but no separate, human-friendly **activity feed**. **Recommendation:** the thread's message
  stream *is* the activity record for the workspace; the audit trail stays the platform's. Keep them distinct.

---

## §5 — Storage and concurrency, per kind of state (the exit gate)

The exit gate requires: *state the storage and concurrency decision for each kind of thread state
(collaborative vs business), trace each to code that exists or name it "to build".*

| Kind of state | Examples | Storage (now) | Concurrency (now) | Verdict |
|---|---|---|---|---|
| **Thread identity & metadata** | title, status, visibility, owner | `ai_chat_conversations` (`entities.ts:717`) | ordinary transactional | **BUILT** |
| **Human participation** | who is in the thread, what role | `ai_chat_conversation_participants` (`:806`) | transactional; unique index enforces one role per user | **BUILT** |
| **Conversation content** | messages, cards | `ai_chat_messages` (`:880`), `uiParts` | append-only; `clientMessageId` idempotency | **BUILT** |
| **AI participation (as a peer)** | the agent as a participant | *(none — AI is `agentId`)* | — | **TO BUILD** (§4 Gap 1) |
| **Thread contents (placed Widgets)** | the widgets in this workspace | *(none — reuse the registry's instances, §4 Gap 2)* | transactional | **TO BUILD** (reuses `business-widget/registry`) |
| **Anchored comments** | a comment on a row/cell/field | *(only free-form `metadata` today)* | transactional | **TO BUILD** (typed anchor + §176 access check) |
| **Presence** | who is looking now | *(none)* | — | **TO BUILD (later; non-core)** |
| **Collaborative *document* state** | notes, layout, annotations | *(none)* | would need CRDT/OT (§59) | **TO BUILD (only when a doc surface exists)** |
| **Business state** | invoices, inventory, payments | the platform's business tables | **transactional** (optimistic locking, commands) | **BUILT — and MUST stay separate (§58)** |

**The §58 rule, honoured by construction.** The thread layer **cannot write business data**: it has no code
path to the write path (the Business Command path B1/B4 documented). So *"do not use generic collaborative
merging as the authority for financial/operational state"* is **satisfied today** — not by a guard, but by the
absence of any such path. **This must be preserved:** when "thread contents" (Gap 2) is built, the thread must
only ever *place* a Widget and *run* a Function through the Function's own authorization — never mutate a
business record by merging. §6 states this as a rule.

---

## §6 — The rules this layer must hold (so the vision's separation survives)

1. **A thread is collaborative state only.** It may hold messages, notes, layout, annotations, comments. It
   may **never** be the authority for a business record. (§58; observed today: no path exists.)
2. **Business change happens elsewhere.** A thread spawns a business change only by invoking a **Function**
   (which runs through the Function's own authorization — B4) or a **Business Command** (the platform's write
   path). The thread contributes *intent and discussion*, never *state*. (§58, §60.)
3. **The reference is not authorization.** Showing `#payroll-summary` in a thread shares the *reference*; the
   platform evaluates each viewer's access to the underlying data at read time. (§176–178.)
4. **Presence is never authorization.** Who is *watching* is not who may *act*. (§55.)
5. **Activity ≠ audit.** The thread's messages are collaboration history; the audit trail is the record.
   (§103–105.)

---

## §7 — What this hands to B7–B10

- **B7 (extensibility):** a thread is a **host** — a place a Widget can be placed (via the registry's
  `host`/`slot`, §4 Gap 2). B7 will treat "add a widget to a thread" as the same act as "add a widget to a
  dashboard".
- **B8 (the decision):** Buzz's model — **branches as channels, an activity feed, one-signer grouping** — is
  the closest reference system to this batch's subject. B6's measurement **sharpens** B8: Buzz's "channel" ≈
  our conversation thread; Buzz's "feed" ≈ our message stream + a to-be-built activity view.
- **B9 (widget architecture):** the workspace surface B9 builds must **mount the conversation stack that
  exists** (do not build a second chat). The `DockableChat` (16,698 bytes) and the conversation API are the seed.
- **B10 (mapping):** the three "TO BUILD" rows in §5 become concrete items; Gap 1 (AI as participant) is the
  one with a migration, and it joins the same deferred-migration family as `CC-32`/`G-09`.

---

## §8 — Open questions for the owner (rule 11 — the owner decides *what* to build)

All are **non-blockers** (each has a working default), and each is recorded in `discussion_points.md` Part 2.

- **OQ-B6-1 — is the AI a *participant* or the thread's *agent*?** Our recommendation: make the AI a
  participant (a peer in the participants list), keeping `agentId` as the thread's default agent. **One
  question: should an AI appear in a thread's participant list as a peer — so "human and AI in one thread" is
  literally one list — or is "the thread has one agent, plus humans" enough?**
- **OQ-B6-2 — is a thread the same thing as a workspace?** Our recommendation: **a thread *is* a workspace**
  (one container), not two. **One question: is a "saved thread" the same object as a "workspace", or do you
  want several threads inside one workspace?**
- **OQ-B6-3 — do a thread's comments need to anchor to data (a cell, a row, a field)?** Our recommendation:
  build a **typed anchor** with the vision's §176 access check, but keep it simple first. **One question: is
  anchoring a comment to a specific record/cell something you want early, or later?**

---

## §9 — Corrections and open questions

### The hostile-critic round (separate agent, command+output per claim)

A separate hostile-critic agent audited this document against the code. **Four real findings, all fixed in
place above** (rule 13). None changes the document's central claims, which the critic independently verified.

| # | Finding | Truth (command) | Fixed at |
|---|---|---|---|
| B6-C1 | §2b named a **`removeParticipant`** method | There is no `removeParticipant`; the method is **`revokeParticipant`** (`:668`), which sets `deletedAt` (`:705`) and falls back to `private` (`:711-714`) | §2b, header |
| B6-C2 | §2b named an **`assertAccessible`** method | No such symbol; the predicate is the module-level **`findOneAccessibleConversation`** (`:805`); also added the real `listParticipants` (`:575`) / `getParticipantCount` (`:721`) | §2b, header |
| B6-C3 | §2a called **`transcript`** a *method* | The method is **`getTranscript`** (`:378`); `:68-78` is the options/result *interface* | §2a, §0, header |
| B6-C4 | §0 said **"the two gaps"** while §4 names **three** | Internal inconsistency; §0 now names the same three gaps as §4 | §0 |

**Imprecise-but-immaterial, also fixed:** `list` is at **`:214`** (the docstring is `:213`); `DockableChat.tsx`
is **16,698 bytes** (written as "16.7 KB" — decimal-vs-binary rounding).

**Critic findings the document passed** (verified correct, with the command): the four entity citations and
every field line; `createOrGet` requires `agentId` (`:140` — the critic read `:135` as the method, `:140` as
the guard); `addParticipant` (`:606`); the private→shared transitions (`:647-648`, `:660-661`);
`AiChatConversationDuplicateParticipantError` (`:105`); the participant role enum (`:850-851`); `lastReadAt`
(`:853`); **the AI-is-not-a-participant gap** (C7 — `grep -i participant` for an agent/actorKind returns
empty, and the participant entity has only `userId`); **no CRDT/presence layer**
(`grep -rniE "websocket|socket\.io|yjs|crdt|automerge|liveblocks|partykit"` over `packages` → only false
positives); **the thread layer cannot write business data** (`grep -niE "commandBus|executeCommand|
businessCommand"` over the repository + conversations API → empty); the two test counts (36 + 2); and the
vision-analysis §12/§13 quotes (§53–§60, §103–105, §75–78, §121, §176–178) — verbatim and correctly cited.

**Lesson banked:** *a method name is a claim too.* I described the sharing API from the doc-comment's
vocabulary — which said *"sharing extensions append … rows"* — and invented `removeParticipant`/`assertAccessible`
instead of reading the method list. **Enumerate the methods; do not paraphrase the API from its prose.** (Twin
of B5's "name the scope" and B4's "re-measure an inherited negative".)

**Lesson carried from B5 into this batch:** *a count/claim is about a scope — name the scope.* Every claim
above names the table, file and line it rests on; §2e's "no presence layer" is a **scoped** negative
("in production code, for `WebSocket|socket.io|Yjs|crdt`") — to re-measure, run that search.

---

## §10 — What this batch read, and what it deliberately skipped

**Read (measured):** the four entities named in §2a/§2b, the conversation repository, the conversation API
routes, `DockableChat.tsx`, the share dialog/button/renderer, the `messages` module's entities, the vision
analysis §12 and §13, and the vision document's Parts XI–XIII by citation.

**Skipped, with reason:**
- The `messages` module's behaviour — it is the **notification** system, not the thread layer; §2d records the
  distinction. (A full read is B7's if notifications become an extension route.)
- The `pending-actions` flow (`cc-56`/`CC-57`) — it is the write-path confirmation, documented in B4.
- Real-time infrastructure — §2e measured its **absence**, which is the finding; a design for it is not this
  batch's (and the vision defers CRDT to a document surface we do not have).

---

## §11 — Exit gate

**Does the SRS state the storage and concurrency decision for each kind of thread state (collaborative vs
business), trace each to code that exists or name it "to build", and name the owner decisions rather than
closing them?**

**Yes — §5** (the table: five BUILT rows with file/line, four TO-BUILD rows each with its mechanism), **§6**
(the five rules that keep collaborative and business state separate), and **§8** (three owner questions, not
closed).

**Gate result: PASSED.**
