# Batch 10 — Contested ownership: who owns what

**Batch:** 10 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** batch 9's `CONFLICT` list · batch 7's Hermes map · batch 6's platform map · `library/ai/hermes-docs/reboot/CONTESTED-HERMES-VS-COMPANAI.md` (**as a list of questions, not answers**).
**Question this batch answers:** *for every point where Hermes and our platform claim the same job, who wins?*

**Definition of done (from `PLAN.md`):** *every contested item has an owner, a recommendation and a stated consequence.*

---

## 0. How to read this report

**One entry per item.** Each entry says what each side does, whether they actually collide, what the user experiences under each choice, the recommendation in one sentence, how the loser is disabled **concretely**, what breaks if the recommendation is wrong, and **whose decision it is**.

**Three outcomes are allowed. "Both" is not one.**

| Outcome | Meaning |
|---|---|
| **Companai wins** | Hermes's version is switched off or never configured — and we say how |
| **Hermes wins** | our platform stops keeping its own copy and reads Hermes instead |
| **Split by scope** | each owns a **named, non-overlapping** slice — the boundary written down, not implied |

**"We'll sync them" is not an outcome either** — a sync is a third owner, and two owners of one fact is the most expensive bug in this project (it produces no error, only a system that quietly disagrees with itself).

**A boundary rule for the input.** The sibling's `CONTESTED-HERMES-VS-COMPANAI.md` is a **list of questions for a different base** (Paperclip, not Open Mercato). **Its two written-up recommendations (C-1, C-9) are NOT inherited as evidence.** Where my conclusion matches the sibling's, I say so — and I say whether I derived it from our code or merely agree.

**The sibling's counts are stale** (batch 8's lesson). It says *39* providers (measured: **38** in ours, 34 in the sibling's copy), *7* external memory providers (ours: **5**), *22* auxiliary roles (**18 model roles** + 4 settings). **Its numbers are not used as facts here.**

---

## 1. What is in scope

**Fourteen named items** (the plan's list, drawn from the sibling's register C-1…C-13 plus search) · **four new items found in batches 1–9** · = **eighteen**.

| # | Item | From |
|---|---|---|
| C-1 | Approvals | plan (sibling C-1) |
| C-2 | Skills | plan (sibling C-2) |
| C-3 | Scheduling | plan (sibling C-3) — **batch 9 `CONFLICT`** |
| C-4 | Task board | plan (sibling C-4) |
| C-5 | Projects and workspaces | plan (sibling C-5) |
| C-6 | Memory vs knowledge | plan (sibling C-6) — **the founder's sharp question** |
| C-7 | Secrets and credentials | plan (sibling C-7) |
| C-8 | Choosing models | plan (sibling C-8) |
| C-9 | Conversation history | plan (sibling C-9) |
| C-10 | Usage and cost reporting | plan (sibling C-10) |
| C-11 | Chat channels | plan (sibling C-11) — **batch 9 `CONFLICT`** |
| C-12 | Event hooks | plan (sibling C-12) — **batch 9 `CONFLICT`** |
| C-13 | Backup and restore | plan (sibling C-13) |
| C-14 | Search and retrieval | plan (new in batch 9) |
| C-15 | **Delegation (by name)** | **new** — batch 7 §18, batch 9 §4 |
| C-16 | **MCP — two stacks** | **new** — batch 7 §18 |
| C-17 | **The two-kernel question** | **new** — batch 9 §8 Q1 (internal, not Hermes-vs-us) |
| C-18 | **Row-Level Security** | **new** — batch 9 §8 Q8 (internal) |

---

## 2. The register — the table

| # | Contested | Hermes side | Our kit side | Collide today? | Recommendation | Whose |
|---|---|---|---|---|---|---|
| C-1 | Approvals | tool-level guard (`approvals.mode`, pluggable transports) | platform held acts + approvals queue + human identity | **Yes** | **Split by scope** — ours owns *business* actions | **Ramzi** |
| C-2 | Skills | full hub (210 skills, registries, trust) | nothing | No | **Split** — Hermes runs, we publish | ours |
| C-3 | Scheduling | `cron/` (33 files) + `allow_agent_scheduling` | `scheduler` + `webhooks` + `planner` | **Yes** | **Split by scope** — ours owns business jobs | **Ramzi** |
| C-4 | Task board | `kanban` + teams | `user_task` (workflow task queue) | No | **Split** — ours is the business task | ours |
| C-5 | Projects / workspaces | `hermes project` (dev folders) | authority projects + overlays | No (different meaning) | **Split** — different objects, same word | ours |
| C-6 | Memory vs knowledge | `MEMORY.md`/`USER.md` + providers | knowledge/messages + ledger | **Yes (the deep one)** | **Split by the vision's six categories** | **Ramzi** |
| C-7 | Secrets | `hermes secrets`, credential pool | `integrations` credentials + KMS | Partly | **Split** — ours is the tenant store | ours (security: Ramzi) |
| C-8 | Choosing models | 38 providers, fallback, MoA | `llm-adapters` + allow-list | **Yes** | **Split** — ours is the *policy* layer | ours |
| C-9 | Conversation history | `state.db` + FTS5 `session_search` | `messages` + conversations + audit | No | **Split** — both stay | ours |
| C-10 | Usage & cost | `insights`, `monitoring` | `ai_token_usage` + usage page | Partly | **Split** — ours is billing truth | ours |
| C-11 | Chat channels | 34 adapters (29 messaging) | `communication_channels` + imap/gmail | **Yes** | **Split by scope** — ours is the business inbox | **Ramzi** |
| C-12 | Event hooks | hook bus + `webhook` | `events` + `webhooks` + 44 subscribers | **Yes** | **Split by scope** — ours is business events | ours |
| C-13 | Backup & restore | `hermes backup`/`import` | **nothing** | No (a gap) | **Hermes wins for its home; ours is a gap** | ours |
| C-14 | Search & retrieval | FTS5 + CJK + `session_search` | `search` (hybrid) + `query_index` | Partly | **Split** — ours searches business data | ours |
| C-15 | Delegation (name) | task delegation (agent→agent) | authority delegation (human→human) | **Language only** | **Split + rename ours** | **Ramzi** |
| C-16 | MCP | client + 65-definition catalogue | MCP client **and server** | Partly | **Split** — two directions | ours |
| C-17 | The two-kernel question | `N/A` (internal) | act-axis kernel; no data-axis kernel | internal | **Both exist — one stack, two layers** | ours |
| C-18 | Row-Level Security | `N/A` (internal) | app-level tenant guard, no RLS | internal | **App guard authoritative; RLS additive** | ours |

**Three genuine `CONFLICT`s** (C-3, C-11, C-12 — batch 9's list) · **five partial collisions** (C-1, C-6, C-7, C-8, C-10, C-14, C-16) · **two naming-only** (C-5, C-15) · **two internal** (C-17, C-18) · **one gap** (C-13) · **one where we have nothing to contest** (C-2).

---

## 3. The entries

### C-1 · Approvals — **Split by scope. Our gate owns business actions.**

| | |
|---|---|
| **Hermes does** | `approvals.mode` — an LLM *guardian* inside the runtime decides whether a tool call may run, with a policy file, a deny list, a timeout, a denial breaker, and **pluggable transports** so an external system can answer instead (batch 7 §18) |
| **Our kit does** | Held acts + an approvals queue + `pendingActService` — an approval **tied to an authenticated human identity**, company scope and an audit trail (batch 6 §4) |
| **Collide today?** | **Yes.** Both can decide whether an action proceeds |
| **What the user experiences** | *If Hermes wins:* an operator sees nothing in our approvals screen, while the runtime quietly approves things itself — and the **faster, human-free** authority wins by default. *If we win:* business actions wait for a person; a low-risk tool call that Hermes would have waved through now waits too |
| **Recommendation** | **Split by scope: our gate is authoritative for *business* actions** (it needs a human identity Hermes does not have); **Hermes's runtime approval still guards raw tool use** (shell, computer-use — V-11) |
| **How the loser is disabled** | Hermes's mode is set to **`manual`**, never `smart`, and its transport is pointed at our plugin so **we** answer for business actions. `cron_mode` stays `deny` so an unattended run cannot approve itself |
| **What breaks if this is wrong** | If we route *business* approvals through Hermes, an **LLM could approve a business action with no human in it** — which is the product's core promise, inverted. If we route *all* approvals through us, we add human latency to harmless tool calls and nobody answers at 3 a.m. |
| **Cost** | We give up instant automatic approval; we accept latency and the "nobody answered" risk, in exchange for a decision that is auditable and attributable to a person |
| **Whose decision** | **Ramzi's** — it changes what the product promises |

*(My conclusion matches the sibling's C-1 recommendation. I derived it from our own `pendingActService` and Hermes's `approvals.mode`; the sibling's write-up is not the evidence.)*

### C-2 · Skills — **Split: Hermes runs skills; we publish them.**

| | |
|---|---|
| **Hermes does** | A full skill hub — **210 `SKILL.md` files** (58 default + 152 optional in our extract), a hub CLI, registries, trust and drift tracking (batch 7 §3) |
| **Our kit does** | **Nothing.** There is no skill system in our code — batch 6 lists skills as a `GAP` |
| **Collide today?** | No — we have no copy to contest |
| **What the user experiences** | *If Hermes wins the runtime:* agents get skills immediately. *The risk:* a skill runs that was never published from our business truth, and it can drift from the business model with nobody noticing |
| **Recommendation** | **Hermes owns the skill *runtime*; our platform owns skill *publication and governance*** — which skills exist, and from which business truth they were generated (vision N3-59: skills are procedural projections, not the source; N3-60: learning and production namespaces are separate) |
| **How the loser is disabled** | Nothing to disable — we never built a skill runtime. The work is the *opposite*: build the publication path so Hermes only loads skills our registry has approved |
| **What breaks if this is wrong** | If we treat Hermes's skill hub as *authoritative*, an agent can learn and use a procedure that contradicts the business model, and the business model cannot tell. If we try to build our own runtime, we rebuild a tested system for nothing |
| **Cost** | We depend on Hermes's skill format, and a "published" skill must still be installed into Hermes's home |
| **Whose decision** | **Ours** (technical), with the governance rule confirmed |

### C-3 · Scheduling — **Split by scope. Our scheduler owns business jobs.** *(batch 9 `CONFLICT`)*

| | |
|---|---|
| **Hermes does** | `cron/` — **33 files**: a scheduler, a tick, detached workers, job definitions, occurrences, quota holds, a delivery queue, incidents and a monitor (batch 7 §13). An agent can schedule its own work (`allow_agent_scheduling`) |
| **Our kit does** | A `scheduler` module (6,027 lines) + `webhooks` + `planner`, with commands, workers, CLI and migrations (batch 6 §8) |
| **Collide today?** | **Yes.** Two schedulers, two ideas of "when" |
| **What the user experiences** | A job scheduled in one is **invisible to the other**. A user who sets "every Monday" in the platform may see an agent's own cron job fire on a different cadence, and **nothing tells them there are two clocks** |
| **Recommendation** | **Split by scope: our scheduler owns *business* scheduled work** (user-visible, tenant-scoped, audited); **Hermes's cron owns *runtime* chores** (agent wake-ups, internal maintenance). **The test: if the user would see it, or it touches business data, it is ours** |
| **How the loser is disabled** | `allow_agent_scheduling` is **off** by default, so an agent cannot create a business job without passing our gate. Hermes cron keeps only its own maintenance jobs |
| **What breaks if this is wrong** | **A scheduled business job fires twice, or once, and nobody can say which clock owns it** — the exact "two truths" failure. If Hermes wins entirely, an agent can schedule business work with no tenant scope and no audit |
| **Cost** | Two schedulers still exist. **The split does not remove the second scheduler — it only labels it.** The boundary must be *enforced* (a gate on job creation), not implied |
| **Whose decision** | **Ramzi's** — it is user-visible |

### C-4 · Task board — **Split. Our `user_task` is the business task.**

| | |
|---|---|
| **Hermes does** | `kanban` — a multi-profile **collaboration board** for agents, plus a teams pipeline (batch 7 §17) |
| **Our kit does** | `user_task` — a **human workflow task**: `workflow_instance_id`, `step_instance_id`, `task_name`, `assigned_to`, `assigned_to_roles`, `claimed_by`, `due_date`, `escalated_at`, `completed_by`, `comments`. It is the workflow engine's human-step queue (verified in `core/generated/entities/user_task`) |
| **Collide today?** | **No.** One is a *human step in a governed workflow*; the other is *which agent is working what* |
| **What the user experiences** | Nothing changes today. *If we adopted Hermes's kanban as our task board:* our workflow steps would appear on an agent board with no tenant scope, and a business task could be completed by an agent outside our authorization |
| **Recommendation** | **Split by scope: our `user_task` is the business task** (tenant-scoped, audited, part of a governed workflow); **Hermes kanban is the agent-collaboration board** (V-10, currently `HOLD`) |
| **How the loser is disabled** | Hermes kanban stays off unless we decide to adopt multi-agent collaboration. No configuration needed today |
| **What breaks if this is wrong** | If we make Hermes's board the business task board, **workflow tasks lose their authorization and audit**. If we build a second board over `user_task`, we duplicate the workflow engine |
| **Cost** | If we later want multi-agent boards, we either take Hermes's or grow `user_task` — a decision deferred, not avoided |
| **Whose decision** | **Ours** |

### C-5 · Projects and workspaces — **Split. Different objects that share a word.**

| | |
|---|---|
| **Hermes does** | `hermes project` — **named multi-folder workspaces** (where the agent's files live) |
| **Our kit does** | **Authority projects** — `authority_projects`, project memberships, project records and project overlays: a **governance scoping** layer (who may act, on which records). Plus `staff` timesheet projects (HR) |
| **Collide today?** | **No — they are not the same object.** Ours scopes *authority*; Hermes's scopes *files* |
| **What the user experiences** | Nothing. The risk is purely linguistic: a document that says "project" without saying which |
| **Recommendation** | **Split by scope, and write the distinction down** — ours is the **business/governance project**; Hermes's is the **agent filesystem workspace** |
| **How the loser is disabled** | Nothing to disable |
| **What breaks if this is wrong** | A reader equates them and builds an authority scope out of a filesystem path (or the reverse) — the same class of error as the "Capability" collision in batch 1 |
| **Cost** | One more vocabulary collision to keep straight |
| **Whose decision** | **Ours** |

### C-6 · Memory vs knowledge — **Split by the vision's six categories. The deepest call.**

| | |
|---|---|
| **Hermes does** | `MEMORY.md` + `USER.md` injected at session start, plus **5 external memory providers** in our extract (byterover, holographic, mem0, openviking, retaindb). Only **one** provider may be registered at a time. It is **personal / per-profile** (batch 7 §6) |
| **Our kit does** | The `messages` module (unified inbox + an object-link registry), `knowledge`-style content, and the **hash-chained ledger** — but **no per-agent memory** |
| **Collide today?** | **Yes, at the boundary the founder named.** Hermes's memory is *something the agent already has*; ours would be *something an agent must go and fetch* |
| **What the user experiences** | *If Hermes owns it:* the agent reasons with knowledge already in its head — **better quality**, as the founder argued. *If we own it:* the agent must fetch, and **unauthorized data can enter the fetch path** — unless we build the guard first. *If we build our own memory:* we rebuild five tested providers, which is the **reverse of "capitalise on Hermes, not the reverse"** |
| **Recommendation** | **Split by the vision's own six categories (N3-34).** Hermes owns **Agent Memory** and **Session History** (personal, contextual). Our platform owns **Business Truth**, **Platform Definition**, **Tenant Knowledge** (governed documents with provenance, rights, freshness and review) and **Procedural Skills** (published). **The deciding rule: knowledge that must be *authorized* cannot live in Hermes's memory, because Hermes has no tenant and no authorization** (R-16/N8-23) |
| **How the loser is disabled** | Nothing is disabled. The work is the *boundary*: our retrieval filters by tenant/org/classification/permission **before** anything enters Hermes's context, and Hermes's memory is never treated as business truth |
| **What breaks if this is wrong** | *If we build our own memory:* we take on five tested providers' worth of work, and the agents get worse (they lose knowledge already in their brain). *If Hermes owns everything:* **unauthorized business data enters the agent's brain**, and `MEMORY.md` becomes a business record with no authorization and no audit — the exact failure the vision exists to prevent |
| **Cost** | The boundary has to be built and enforced (the AI guards, X-07 — our largest security gap). Neither side is free |
| **Whose decision** | **Ramzi's** — it is the single biggest architectural call in the register |

**On the founder's three questions, answered directly:**
1. *"Is it worth building when it already exists in Hermes?"* — **For agent memory, no; use Hermes's.** For **tenant knowledge that must be authorized**, yes — because Hermes has no tenant, and a knowledge base with no tenant boundary is a security hole, not a shortcut.
2. *"Doesn't memory in Hermes give better outcomes, because the agent has it in its brain?"* — **Yes, and that is the right instinct for *contextual* memory.** It does **not** apply to *authorized business knowledge*, because unauthorized data must not enter the brain in the first place. The two are different things and the vision already separates them (N3-34).
3. *"Can we build something better than what Hermes tested and optimised?"* — **For memory: no.** For **governed, authorized knowledge**: it is not a *better memory*, it is a **different object** — Hermes's memory has no permission model to beat.

### C-7 · Secrets and credentials — **Split. Ours is the tenant store.**

| | |
|---|---|
| **Hermes does** | `hermes secrets` (Bitwarden, 1Password backends), a **credential pool** with rotation, and `auth.json` for runtime keys (batch 7 §9) |
| **Our kit does** | The `integrations` module — per-integration **credentials** (`api/[id]/credentials/route.ts`), health, state, version and logs — plus KMS-backed per-tenant encryption (`tenantDataEncryptionService`, `encryption_maps`) and `api_keys` (batch 6 §5) |
| **Collide today?** | **Partly.** Both can hold a credential |
| **What the user experiences** | *If a tenant's key lands in Hermes:* it is stored per-profile, not per-tenant, and **a second profile sharing that home could use it**. *If everything goes to ours:* the agent cannot rotate its own model keys without us |
| **Recommendation** | **Split by scope: our `integrations` store is the *tenant business* credential store** (audited, tenant-scoped); **Hermes's pools are *runtime* keys only** (the agent's own model access, rotated). **Hard rule: Hermes credential pools are not the tenant secret store** (N3-66) |
| **How the loser is disabled** | Hermes's vault is configured for runtime keys only; tenant credentials are never placed in a Hermes home |
| **What breaks if this is wrong** | **A tenant's credential leaks across profiles** (Hermes's home is per-profile, not per-tenant — L-001: a shared home corrupts memory). If we hold everything, the agent cannot rotate its own keys |
| **Cost** | Two stores to operate; a key must be classified before it is stored |
| **Whose decision** | **Ours** (technical) — with the **security constraint confirmed by Ramzi** |

### C-8 · Choosing models — **Split. Ours is the policy layer.**

| | |
|---|---|
| **Hermes does** | **38** providers, hot-swappable, fallback chains, mixture-of-agents, and auxiliary/chore models (batch 7 §9) |
| **Our kit does** | `llm-adapters/`, `model-factory.ts`, `model-allowlist.ts`, `llm-bootstrap.ts`, `openai-compatible-presets.ts` (batch 6 §6) |
| **Collide today?** | **Yes, at the allow-list.** Both can say "this model may be used" |
| **What the user experiences** | *If Hermes wins:* a tenant's model policy is not enforced — the agent can reach any of 38 providers. *If we win entirely:* we lose Hermes's fallback and local-first routing, and a provider outage takes us down |
| **Recommendation** | **Split by scope: Hermes owns *how to reach* a model** (providers, fallback, local runtime); **our platform owns *which* model is allowed** (tenant policy, allow-list, data classification). This is exactly the vision's N4-05: *"a platform-level Model Policy layer above Hermes' model management"* |
| **How the loser is disabled** | Our allow-list is the authority; Hermes's catalogue is the *capability*, and only allow-listed models are configured into a home |
| **What breaks if this is wrong** | If Hermes's catalogue is authoritative, **model routing ignores data classification** (N4-24/N8-176) and a tenant can reach a provider they did not approve. If our allow-list is authoritative but stale, a legitimate model is unavailable |
| **Cost** | We must keep the allow-list in step with Hermes's catalogue — a maintenance job, not a one-off |
| **Whose decision** | **Ours** (technical); the **tenant default policy is Ramzi's** |

### C-9 · Conversation history — **Split. Both stay.**

| | |
|---|---|
| **Hermes does** | One `state.db` per home, holding every message of every session, with FTS5 `session_search` — full-text, **no model calls, so zero cost** (batch 7 §7) |
| **Our kit does** | `messages` (unified inbox + object links), `ai-assistant` `conversation-storage.ts`, and the `audit_logs` ledger (batch 6 §3a, §6) |
| **Collide today?** | **No — and this is the finding.** They **nest** instead of colliding |
| **What the user experiences** | Nothing breaks. What breaks is *assuming one covers the other*: "our DB stores it, so the agent knows it" is **false** — a transcript that never entered the agent's context has not been read |
| **Recommendation** | **Split, both stay: Hermes owns each agent's own thread; we own the shared, multi-party conversation.** A room can **never** be one Hermes session — a stored Hermes message has **no author field** (`hermes_state_common.py:449`, verified batch 8), so it cannot record *which* agent spoke |
| **How the loser is disabled** | Nothing to disable. The work is to **write each shared message into each participating agent's session** so the agent actually has it |
| **What breaks if this is wrong** | *"Hermes remembers, so we need not store it"* — a human could not read what happened, and a new agent would have nothing given to it. *"We store it, so the agent knows it"* — the agent answers from nothing |
| **Cost** | Every shared message is written twice — once to our store, once per participating agent. A room with eight agents does eight writes per message. Storage is cheap; the number to watch is the write fan-out |
| **Whose decision** | **Ours** |

*(This matches the sibling's C-9 conclusion, and here I *did* verify the deciding fact independently: the missing `author` column, from our own copy at `hermes_state_common.py:449`.)*

### C-10 · Usage and cost reporting — **Split. Ours is billing truth.**

| | |
|---|---|
| **Hermes does** | `insights` and `monitoring` — runtime telemetry over runs and providers |
| **Our kit does** | `ai-assistant` records **AI token usage**: `AiTokenUsageRepository`, `token-usage-recorder.ts`, `usage-serialization.ts`, a usage stats page, and a `Migration…ai_token_usage` (verified in `packages/ai-assistant`) |
| **Collide today?** | **Partly.** Both count tokens |
| **What the user experiences** | *If Hermes's numbers are the customer's bill:* the number is runtime-scoped, not tenant-scoped, and **a spend guard cannot be enforced from it**. *If ours is:* the customer sees an auditable, tenant-scoped figure |
| **Recommendation** | **Split by scope: our platform owns *business* cost reporting** (per tenant, per user, billable, audited — the authority for what is charged); **Hermes owns *runtime* telemetry** (per-run token counts, provider health, for operators) |
| **How the loser is disabled** | Hermes's insights are labelled operational; our `ai_token_usage` is the record of charge |
| **What breaks if this is wrong** | **A customer is billed from runtime telemetry that no one can audit** — and the spend guard (the sibling's "dashboard spend ≠ real cost", L-011) cannot be trusted |
| **Cost** | Usage from Hermes's runs must be recorded into our store — a write path that must not be lost |
| **Whose decision** | **Ours** |

### C-11 · Chat channels — **Split by scope. Ours is the business inbox.** *(batch 9 `CONFLICT`)*

| | |
|---|---|
| **Hermes does** | A gateway with **34 platform adapters, 29 of them messaging** — Slack, Discord, Telegram, WhatsApp, Signal, Matrix, Mattermost, WeChat, QQ, Teams, Line, IRC … (batch 7 §18) |
| **Our kit does** | `communication_channels` (channel hub bridging Slack/WhatsApp/email to Messages) + `channel_imap` + `channel_gmail` (batch 6 §8) |
| **Collide today?** | **Yes.** A message can arrive through **two doors** |
| **What the user experiences** | *If both are on:* the same customer message can land in our inbox **and** the agent's chat, with no single owner of the thread or the reply. *If Hermes wins:* business messages bypass our inbox, our audit, and our tenant boundary |
| **Recommendation** | **Split by scope: our channels own *business* messages** (a customer email → a case → an audit trail, tenant-scoped); **Hermes's adapters own *how an agent is reachable*** (its own chat presence — V-05). **Hard rule: a message arrives through exactly one door; if it is a business message, it is ours** |
| **How the loser is disabled** | Hermes's messaging adapters are enabled only for agent-facing chat, not for the business channels we already own |
| **What breaks if this is wrong** | **A customer's message is answered twice, or lost between the two stacks** — and if Hermes answers, it answers with no tenant scope and no audit |
| **Cost** | Channel sprawl; **each adapter is an attack surface** (V-05's stated risk) |
| **Whose decision** | **Ramzi's** — it decides what "talk to your platform" means |

### C-12 · Event hooks — **Split by scope. Ours is business events.** *(batch 9 `CONFLICT`)*

| | |
|---|---|
| **Hermes does** | A hook bus (shell scripts fired on runtime events: tool ran, memory written) plus a `webhook` facility |
| **Our kit does** | The `events` bus (`bus.ts`, `bridge.ts`, single-delivery guarantee) + the `webhooks` module + **44 subscriber directories** (batch 6 §8) |
| **Collide today?** | **Yes.** Two buses can deliver the same event |
| **What the user experiences** | *If both are on:* a business event fires twice (or once, from the wrong bus), and no one owns "what happened when". *If Hermes wins:* business events leave our audit chain |
| **Recommendation** | **Split by scope: our event bus owns *business* events** (an entity changed → subscribers, audited, part of the ledger); **Hermes hooks own *agent-runtime* events** (tool calls, memory writes) |
| **How the loser is disabled** | Hermes's hook bus is not wired to business events; its hooks stay runtime-scoped |
| **What breaks if this is wrong** | **A business event is delivered by Hermes's bus, outside our ledger** — the audit chain breaks silently, and "why did this happen" has no answer |
| **Cost** | Two buses to operate; the boundary is enforced by *not wiring* Hermes to business events |
| **Whose decision** | **Ours** |

### C-13 · Backup and restore — **Hermes wins for its home; ours is a gap.**

| | |
|---|---|
| **Hermes does** | `hermes backup` / `import` — per-home backup of its own runtime state (sessions, memory, config) |
| **Our kit does** | **Nothing.** No backup module exists in the starting-kit (searched by directory name and by content) |
| **Collide today?** | No — we have no backup to contest |
| **What the user experiences** | *Today:* Hermes's runtime state is backed up; **the business database is not** — and there is no restore path for it |
| **Recommendation** | **Hermes wins for its own home. Our platform's backup/restore is a *gap*, not a contest** — and Doc 8 requires it (N8-205: backups are another data boundary; restore is high-impact and audited) |
| **How the loser is disabled** | Nothing to disable — Hermes backs up its home; we must **build** business backup/restore |
| **What breaks if this is wrong** | **A tenant's business data has no tested restore path.** This is not a conflict — it is a **gap carried to batch 11** |
| **Cost** | A real build, not a configuration |
| **Whose decision** | **Ours** |

### C-14 · Search and retrieval — **Split. Ours searches business data.**

| | |
|---|---|
| **Hermes does** | `state.db` FTS5 with a **CJK bigram** tokenizer, and `session_search` over its own session history (batch 7 §7; V-06) |
| **Our kit does** | `packages/search` — hybrid `tokens`/`vector`/`fulltext` with `pgvector`/`qdrant`/`chromadb` drivers — plus the `query_index` module (batch 6 §7) |
| **Collide today?** | **Partly.** Both are "search" |
| **What the user experiences** | *If Hermes's search covers business data:* retrieval is **not tenancy-filtered** and vector score becomes a de-facto permission. *If ours is the only one:* we lose Hermes's free session recall |
| **Recommendation** | **Split by scope: our search owns *business* data** (tenant-filtered, classification-aware, authorized projection); **Hermes's search owns *its own session history*** (personal, free). **Hard rule: vector score is not authorization** (N8-32, N8-153) |
| **How the loser is disabled** | Hermes's `session_search` is scoped to sessions; it is never pointed at business tables |
| **What that costs / what breaks if wrong** | **Our search's tenancy filtering and classification-awareness are unproven today** (batch 6 §18 #7) — so this recommendation carries an unfinished prerequisite. If we skip it, a vector search can return another tenant's rows |
| **Whose decision** | **Ours** |

### C-15 · Delegation (by name) — **Split + rename ours. A language collision.** *(new)*

| | |
|---|---|
| **Hermes does** | **Task delegation** — an agent hands a bounded goal to a subagent (`delegate_tool.py`; a subagent receives a bounded goal, not the parent's conversation) |
| **Our kit does** | **Authority delegation** — `delegations.ts`: a human says "you may act for me" (human→human), with scope and audit (batch 6 §4) |
| **Collide today?** | **In language only.** They never collided in code — but both are called "delegation" |
| **What the user experiences** | Nothing today. The risk is that a document (or a developer) treats *authority delegation* as *task delegation*, and **permission is assumed to have transferred** — which the vision forbids (N3-56: agent-to-agent messaging is not permission transfer) |
| **Recommendation** | **Split by scope and rename ours** — ours stays *authority delegation*; Hermes's becomes *task delegation* / *subagents*. The words must not be used interchangeably in any document |
| **How the loser is disabled** | Nothing to disable; the fix is vocabulary |
| **What breaks if this is wrong** | A reader assumes a subagent inherits its parent's authority (N8-18 forbids it), or assumes an authority delegation runs a task |
| **Cost** | One more vocabulary collision to police — the same class as "Capability" (batch 1 §7) |
| **Whose decision** | **Ramzi's** — a naming decision that affects every document |

### C-16 · MCP — **Split. Two directions, not two owners.** *(new)*

| | |
|---|---|
| **Hermes does** | An MCP **client** with a catalogue of **65** optional MCP definitions, plus security and a picker (batch 7 §10) |
| **Our kit does** | `ai-assistant` ships an MCP **client *and* server** (`mcp-client.ts`, `mcp-server.ts`, `mcp-tool-adapter.ts`, `mcp-server-config.ts`) (batch 6 §6) |
| **Collide today?** | **Partly.** Both can be an MCP client; only we expose a server |
| **What the user experiences** | *If both are the client:* an external tool can be reached by two paths with different permissions. *If the boundary is clear:* Hermes reaches out; our server is how the platform's own tools are exposed to agents |
| **Recommendation** | **Split by scope: our MCP *server* exposes the platform's tools to agents** (the business boundary — N3-40: domain MCP servers expose domain boundaries and least privilege); **Hermes's MCP *client + catalogue* is how an agent reaches outside systems** |
| **How the loser is disabled** | Nothing to disable — the directions are opposite. Each external MCP must be vetted before it is enabled (N8-146: MCP servers are not trust roots) |
| **What breaks if this is wrong** | **An external MCP server is treated as a trust root** and its caller gains authority it should not have (N8-20/N8-146) |
| **Cost** | Each of the 65 catalogue entries is a third-party integration to vet (V-13's stated risk) |
| **Whose decision** | **Ours** |

---

## 4. The two internal contests (not Hermes-vs-us)

Batch 9 §8 left two questions that are contests **inside our own design** — our layer against the vision's. They are not Hermes overlaps, so they get their own section.

### C-17 · The two-kernel question — **Both exist. One stack, two layers.**

| | |
|---|---|
| **What each side is** | **Our resolver** answers *how much autonomy may this actor exercise* (act axis) — a `Decision` with a gate, reasons, binding rule and obligations. **Doc 8's policy kernel** answers *which rows, fields, relationships and values may this actor touch* (data axis) — a `SecurityDecision` with `allowed_fields`/`denied_fields`/scope |
| **Do they collide?** | **No — they are two axes, not two owners.** Our `Decision` has no field list; Doc 8's has no autonomy gate (batch 5 §16) |
| **What the user experiences** | Today: our kernel decides autonomy but **not** data exposure, so a permitted action can still return a field it should not |
| **Recommendation** | **Both must exist, as two layers of one authorization stack.** Our act-axis kernel decides *whether* and *with what gate*; a data-axis layer decides *which rows/fields/values*. **The act-axis kernel calls the data-axis layer — there is still exactly one decision point** (I5: a second policy implementation is a bug) |
| **How the loser is disabled** | Not applicable — the loser is the *absence* of a layer. The work is to build the data-axis layer (a gap, X-01…X-03) |
| **What breaks if this is wrong** | If we treat them as one kernel, we either drop data-level authorization (a security hole) or duplicate the decision point (a bug). If we build them as two independent kernels, **two components decide** — which I5 forbids |
| **Whose decision** | **Ours** (architecture); the **build priority is Ramzi's** |

### C-18 · Row-Level Security — **The app guard is authoritative; RLS is additive.**

| | |
|---|---|
| **What each side is** | Our **query-engine guard**: `tenant_id` is *required* on every query (`query/engine.ts`) — a hard application-level boundary, but **no `ROW LEVEL SECURITY` anywhere**. Doc 8 §16 wants **RLS as defence in depth** and says *"the model is never a tenant barrier"* |
| **Do they collide?** | Not as owners — as *layers*. The question is whether the app guard is *enough* |
| **What the user experiences** | Today: a query without a tenant is refused. The residual risk is a code path that bypasses the query engine |
| **Recommendation** | **The app guard is the authoritative boundary; RLS is added as defence in depth, never as a second policy implementation.** Doc 8 §16 accepts the application layer as one of the layers; RLS closes the "code path that bypasses the engine" hole |
| **How the loser is disabled** | Not applicable. RLS is added; the app guard stays the primary check |
| **What breaks if this is wrong** | If RLS becomes the *only* boundary, a mistake in policy code leaks at the database. If RLS is treated as a *second decision point*, we have two policy implementations (I5 again) |
| **Whose decision** | **Ours** (technical), with a **security confirmation from Ramzi** |

---

## 5. Critic pass — argue the other side of each recommendation

The plan asks for this by name. I took my own recommendation and **argued against it**. The strongest counter-arguments:

| # | My recommendation | The other side — and whether it wins |
|---|---|---|
| C-1 | Split; our gate owns business actions | **"You are adding human latency to harmless tool calls."** — **Partly wins.** The split must be *risk-graded*: only actions above a risk class wait for a human (Doc 8 §206). **My entry under-specified this; it is now a condition on the recommendation** |
| C-2 | Hermes runs skills, we publish | **"Publishing adds a gate between the agent and a skill that works today."** — **Does not win**, but it sets the cost: the gate must be cheap (a registry entry), not a review per use |
| **C-3** | Split; ours owns business jobs | **"A split does not remove the second scheduler — it only labels it. You still have two clocks."** — **This is the strongest counter in the batch, and it partly wins.** The split is honest only if the boundary is *enforced* by a gate on job creation. **If it cannot be enforced, the honest answer is "Hermes wins" — one scheduler.** This is flagged for Ramzi as a real fork |
| C-4 | Split; ours is the business task | **"Two task systems is the same disease."** — **Does not win**, because they are genuinely different objects (a workflow step vs an agent board), and today they do not collide |
| C-5 | Split; different objects | **"They share a word; a split is just naming."** — **Wins as a criticism.** The remedy is *vocabulary*, not architecture, and should be treated as a naming fix, not a design decision |
| C-6 | Split by the six categories | **"The founder is right — build nothing; govern Hermes's memory."** — **Partly wins for *agent* memory** (build nothing). **Does not win for *authorized* knowledge** (Hermes has no tenant). But the counter exposes the real risk: **we may be about to build a knowledge base we do not need.** The honest position: build only the *authorization boundary*, not a parallel memory |
| C-7 | Split; ours is the tenant store | **"Two secret stores is two places to leak from."** — **Partly wins.** The rule must be *one direction*: tenant secrets never enter a Hermes home. Stated as a hard rule, not a preference |
| C-8 | Split; ours is policy | **"Your allow-list will go stale and block a legitimate model."** — **Wins as a maintenance risk.** The allow-list needs a *default-deny with a reviewed exception path*, not a static list |
| C-9 | Both stay | **"Double-writing every message is a cost with no error surface — silent drift."** — **Wins as a cost.** It is the number to watch (write fan-out), and it needs a test |
| C-10 | Ours is billing truth | **"Two counters will disagree and the customer will see both."** — **Wins.** Only *our* number may be shown as billable; Hermes's must be operator-only |
| **C-11** | Split; ours is the business inbox | **"Use Hermes's 34 adapters and stop building channels."** — **Partly wins.** For *agent-facing* chat we should use Hermes's. For *business* messages we cannot — they need our tenant and audit. The split stands, but the build case for our own adapters weakens |
| C-12 | Split; ours is business events | **"Two buses is two truths."** — **Does not win** (same reasoning as C-4), but the boundary must be *enforced by not wiring*, not assumed |
| C-13 | Hermes wins its home; ours is a gap | **"You called a gap a decision."** — **Wins, and it is the point.** C-13 is not a contest; it is a **missing build**. Recorded as a gap, not dressed as a resolution |
| C-14 | Split | **"Hermes's search is free and proven; yours is unproven and unfiltered."** — **Wins as a prerequisite.** The recommendation is only safe once our search is tenancy-filtered — which it is not yet |
| C-15 | Split + rename | **"A naming fix is not an ownership decision."** — **Wins.** C-15 belongs in the vocabulary register, not the ownership register |
| C-16 | Split by direction | **"Two MCP clients is still two clients."** — **Does not win**, because the directions are opposite (out vs in) |
| C-17 | Both exist, one stack | **"Two layers is two kernels with a nicer name."** — **Does not win**, if the rule "exactly one decision point" is enforced: the act-axis kernel *calls* the data-axis layer |
| C-18 | App guard + RLS additive | **"RLS is a second policy implementation — I5 forbids it."** — **Partly wins.** RLS must be a *derived* enforcement of the same policy, not an independent one, or it violates I5. **This is a real constraint on the recommendation** |

**Three counter-arguments won outright and changed the recommendation:**
1. **C-13 is a gap, not a decision** — restated as a build, not a resolution.
2. **C-15 and C-5 are naming fixes, not ownership decisions** — moved in kind.
3. **C-18's RLS must be *derived* from the same policy**, or it becomes a second decision point (I5).

**Two remain genuinely open for Ramzi, not settled here:**
- **C-3 — if the boundary cannot be enforced, the honest answer is "one scheduler", not a split.**
- **C-6 — we may be about to build a knowledge base we do not need; the only thing worth building is the authorization boundary.**

---

## 6. Definition of done

- **"Every contested item has an owner, a recommendation and a stated consequence."** Met — all 18 entries carry a recommendation, a "how the loser is disabled", and a "what breaks if this is wrong".
- **"Mark which are Ramzi's decisions and which are ours."** Met — the register's last column. **Ramzi's: C-1, C-3, C-6, C-11, C-15** (plus a security confirmation on C-7 and C-18, and the tenant model default on C-8). **Ours: the rest.**
- **"Critic pass — argue the other side."** Met — §5, all 18 argued; three changed, two left open.

**Met?** Yes — with two items **deliberately left open** (C-3, C-6), because closing them is Ramzi's call and this report may not close a decision that is his.

---

## 7. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **C-3 — one scheduler or two?** A real fork, not settled | **Ramzi**, then batch 12 |
| 2 | **C-6 — build the knowledge base, or only the authorization boundary?** | **Ramzi**, then batch 12 |
| 3 | **C-13 — business backup/restore does not exist** — a gap | **Batch 11** |
| 4 | **C-14 — our search is not tenancy-filtered** — a prerequisite | **Batch 11** |
| 5 | **C-17 — the data-axis authorization layer must be built** | **Batch 11** |
| 6 | **The five Ramzi decisions** (C-1, C-3, C-6, C-11, C-15) | **Batch 12** |
| 7 | **The vocabulary register** — Capability, delegation, project, widget: four collisions to fix | **Batch 11 / batch 12** |
| 8 | **The sibling's register is not inherited** — its C-1/C-9 recommendations were re-derived from our code, not adopted | Recorded |

---

## 8. The owner's decisions — recorded 2026-10-04

**Ramzi's instruction, verbatim:** *"for the 5 open questions, we follow your recommendations."*

The five items §6 left open as his to decide are now **decided, in favour of the recommendations in §3**. The analysis above is unchanged; this section records the outcome. **A decision recorded here is a gate, not a preference** — the build order in batch 11 and the plan in batch 12 must obey it.

| # | Item | **Decided** | What follows from it |
|---|---|---|---|
| **C-1** | Approvals | **Split by scope — our gate owns business actions** | Hermes's approval mode is set to **`manual`, never `smart`**; its transport points at our plugin. Hermes still guards raw tool use (shell, computer-use). **Condition from the critic pass: the split is risk-graded** — only actions above a risk class wait for a human (Doc 8 §206) |
| **C-3** | Scheduling | **Split by scope — our scheduler owns business jobs** | Hermes cron keeps runtime chores only; **`allow_agent_scheduling` off by default**. **The split is valid only if the boundary is *enforced* by a gate on job creation** — the critic's condition. If that gate cannot be built, the fallback stated in §5 applies: **one scheduler**. The gate is therefore a *requirement* on the build, not an optional nicety |
| **C-6** | Memory vs knowledge | **Split by the vision's six categories — build only the authorization boundary** | Hermes owns **agent memory + session history**. Our platform owns **business truth, platform definition, tenant knowledge, procedural skills**. **We do NOT build a parallel memory or a second knowledge base** — that is now on the "do not build" list (batch 11). The work is the **authorization boundary**: retrieval filtered by tenant/org/classification/permission *before* anything enters Hermes's context |
| **C-11** | Chat channels | **Split by scope — ours is the business inbox** | Our channels own business messages (tenant-scoped, audited); Hermes adapters own agent-facing chat. **We do not build our own adapters for agent-facing chat** |
| **C-15** | Delegation (by name) | **Split + rename ours** | Ours stays **authority delegation** (human→human); Hermes's becomes **task delegation / subagents**. The words are not interchangeable in any document — added to the vocabulary register (batch 11) |

**Two consequences that must not be lost.**

1. **C-6 changes what batch 11 may list as a shortcut.** Building a governed knowledge base is now **explicitly not a shortcut we take** — the shortcut is *Hermes's memory, plus our authorization boundary*. The "do not build" list is the place this lands.
2. **C-3 is decided *conditionally*.** The recommendation is adopted, but its own critic argument stands: a split that cannot be enforced is one scheduler wearing two labels. **The enforcement gate is therefore a first-class build item**, and batch 11 must size it.

**Still the owner's, and not closed by this instruction:** the **security confirmation on C-7 (secrets) and C-18 (RLS)**, and the **tenant model-policy default on C-8 (models)**. These were marked "ours (technical), with a security confirmation" and were not among the five.
