# The Hermes service map — how Hermes and Llama serve every piece of the platform

**What this document is.** The owner asked (2026-10-06) for **one accurate map, written for a new
developer**, showing — **for every piece of development that touches AI** — how **Hermes** *serves* the
platform or is *served* by it, and where **Llama** (the model layer) sits. The goal stated by the owner:
*"clear to execute without a huge learning curve."*

**Why it is needed.** AI is an ingredient in almost every joint of this platform. Hermes holds model
management, integrations and the learning loop; **all AI must go through Hermes.** Without one map, a
new developer re-discovers the wiring joint by joint and gets it wrong. This document is that map.

**What it rests on** (read those first, they are the authority — this page only tells you *how they
connect per item*):

| Reads as | Document |
|---|---|
| **The runtime boundary** (who owns what) | [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) — platform vs runtime, the typed port, multi-tenancy, displacing OpenCode, §11 B-05 |
| **The model layer** (Llama / llama.cpp) | [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) — llama.cpp as one preset entry, the two defects, §9 the model-default decision |
| **The agent half** (the five kinds of agent) | [`AGENT-HALF.md`](AGENT-HALF.md) — kinds, responsibility, where each lesson lands |
| **The order** | [`BUILD-ORDER.md`](BUILD-ORDER.md) — which phase each item sits in |

**The load-bearing rule of this whole page** (from the runtime-boundary decision, B-05):

> **Hermes is a supervised private Python runtime *behind one internal typed port*. It is headless.
> The platform owns every surface a user sees, every fact a customer is answerable for, and every
> decision about authority.** Hermes is an engine we own the crankshaft of.

**Status in one line.** *Hermes and the map below are DESIGN, part-built. Nothing here is claimed as
working; each row carries the honest measured status.*

**Coverage, stated honestly (measured 2026-10-06).** The BACKLOG holds **43 open items**, of which
**~20 touch AI**. §4.1–§4.3 map the items named in the build order; **§4.4 maps every remaining
AI-touching item**, grouped — so no item that touches Hermes or Llama is left unnamed. An item that
touches neither (a pure-CSS fix, a locale file) is deliberately **not** in this map.

---

## 0. The one-page picture

Three pieces run together. Two arrows connect them, and **each arrow is the subject of this map.**

```
  ┌─────────────────────────────┐         ┌──────────────────────────────┐
  │   THE PLATFORM (ours)       │  (1) MCP, authorized by our gate      │
  │   the Starting Kit          │◀────────────────────────────────────▶ │
  │   — owns identity, truth,   │         ┌──────────────────────────┐   │
  │     authority, records      │         │   HERMES (borrowed)      │   │
  │   — owns every surface      │  (2)    │   the agent runtime      │   │
  │   — owns the model control  │─────────▶   the reasoning loop      │   │
  │     plane (Llama presets)   │  inference│  tool orchestration     │   │
  └─────────────────────────────┘   request └──────────────────────────┘   │
              │                                        │                 │
              │ routes every call to a model           │ asks for inference
              ▼                                        ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │   THE MODEL SERVER (Llama / llama.cpp) — `model:8080`, one preset    │
  │   Local inference, no cloud dependency. Cloud is an interim option.  │
  └─────────────────────────────────────────────────────────────────────┘
```

**The three sentences that fix every joint:**

1. **The platform owns meaning and authority.** Who a user is, what they may do, what is true, who
   approved it, what it cost — all ours. A model cannot authorize itself.
2. **Hermes owns runtime mechanics only** — the reasoning loop, tool orchestration, context assembly,
   provider breadth, sessions. It sits **behind** one typed port and is **headless**.
3. **Llama is one entry in the platform's model control plane.** The platform decides *which provider
   and model a tenant may use*; Llama is the local option, reached the same way as any other provider.

---

## 1. The two ways Hermes appears in our work

Every item below falls into **one of two shapes**. A new developer must know which shape they are
looking at, because the work is completely different.

| Shape | What it means | What you write | Example |
|---|---|---|---|
| **Hermes AS an agent** | Hermes *runs* something: a reasoning loop, a tool call, a scheduled job, an assistant. Hermes is the actor. | A **typed port call** — the platform admits a run, mints the scope, and streams the result. You never call Hermes directly. | "The AI reads an invoice and proposes an update." → Hermes is asked to reason; the platform authorizes and records. |
| **Hermes AS wiring (a setting)** | Hermes is *configured*, not run: a model is registered, an MCP tool is exposed, a provider is allowed for a tenant. The platform is the actor; Hermes is set up. | A **setting / registry entry** — a preset, an allowlist row, an MCP server entry. No reasoning loop is involved. | "Let tenant X use the local Llama model." → a model policy row, not an agent run. |

**The rule for choosing:** *if a human's request has to be understood, it is an agent. If an admin
turns a knob, it is wiring.* **Wiring is the cheaper, safer shape — prefer it.** Most AI-adjacent work
on this platform is wiring, and reading it as "an agent" is the most common way a new developer
over-complicates it.

---

## 2. What each side owns — the boundary, so you never guess

Measured from both codebases. **A joint belongs to exactly one side**, and that never changes.

| Concern | Owner | Where it lives | Why it can never move |
|---|---|---|---|
| Tenant, organization, user, principal | **Platform** | `shared/src/lib/auth`, `core/src/modules/auth` | It is the product's identity. A Hermes profile is a folder, not a tenancy model |
| Authorization and authority | **Platform** | `shared/src/lib/authority`, `core/src/modules/auth/api/authority` | Deny-by-default, scoped, auditable. A model cannot authorize itself |
| The canonical business model and its data | **Platform** | `shared/src/lib/kernel`, `business-ir`, `core` | This is the product's reason to exist |
| Conversations, tasks, runs, approvals, audit, budgets | **Platform** | `ai-assistant` entities, `queue`, `events`, `scheduler`, `shared/src/lib/ledger` | These are the records a customer is answerable for |
| **The reasoning loop, tool orchestration, context assembly** | **Hermes** | behind the typed port | The thing we buy instead of build |
| Provider breadth, fallback, retrieval, execution backends | **Hermes**, behind the port | behind the typed port | Genuine capability — but never the authority for *which* provider a tenant may use |
| **Which provider, which model, which data may leave the tenant** | **Platform** | `ai_assistant/lib/model-allowlist.ts` + kernel policy + the preset registry | A commercial and legal boundary, not a runtime preference |
| The model control plane (presets, Llama entry) | **Platform** | `ai_assistant/lib/openai-compatible-presets.ts`, `shared/src/lib/ai/llm-provider-registry.ts` | Llama is *one entry* here; the platform, not Hermes, decides what the entry is |

**Read the last two rows together — they are the Llama answer.** Hermes may *choose* among the
providers it is allowed to use. The platform decides *what those providers are* and *which a tenant
may reach*. Llama is one provider the platform registers; Hermes is one consumer of it.

---

## 3. The port — the only door between the two

Everything crosses **one** typed port. There is no back door: not a Hermes dashboard, not a direct
database connection, not an ambient credential.

```
describeCapabilities(runtimeVersion)   -> runtime version, tool delivery, limits, health
startRun(admittedEnvelope)             -> accepts a run the platform already authorized
streamRun(runId)                       -> ordered, typed events (text, tool, status, usage)
cancelRun(runId)                       -> bounded, idempotent
steerRun(runId, instruction)           -> only if the approval semantics exist
resumeConversation(binding, input)     -> explicit session continuity, never implicit
resolveToolCall(call, capabilityGrant) -> the ONLY path to a business operation
completeRun(runId, result)             -> structured outcome, usage, provenance; idempotent
```

**The envelope** (server-generated, immutable): schema version, run id, tenant id, principal/actor id,
agent id and kind, task id, platform conversation/room id, runtime session id, capability grant id,
policy and model versions, deadlines, budget, correlation id. **Identity fields are minted server-side
and are read-only to the runtime — the runtime cannot name its own tenant.**

**How this looks from the platform side today** (measured 2026-10-06): the port is **not built yet**.
The chat route is wired straight to OpenCode (`api/chat/route.ts` imports `createOpenCodeClient`;
`lib/opencode-handlers.ts` reads `process.env.OPENCODE_URL ?? 'http://localhost:4096'`). **So the first
Hermes work is not Hermes code — it is building this port and moving the chat route onto it while
OpenCode still serves behind it ("rewire first, delete second", tracked as N-8).**

---

## 4. The per-item map — every development item, and how Hermes/Llama serves it

**How to read a row.** *The item* is a piece of development (from `BACKLOG.md` / `BUILD-ORDER.md`).
*Shape* is §1's agent-vs-wiring. *How Hermes serves / is served* says exactly what crosses the
boundary. *Llama* says where the model layer sits (or "n/a" if no model is involved). *Status* is
measured, not assumed.

### 4.1 The foundation items (the ones being built now)

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **D0 — the guard registry delivers guards** | **n/a** (pure platform) | Hermes is not involved. This is the platform's own authorization floor — **the thing that will authorize every Hermes tool call later**. No agent runs. | n/a | ✅ FIXED, mutation-proven |
| **D1 — tiers/defaults/fallbacks are a setting** | **n/a** (pure platform) | The tier a *structural change* takes. When the AI later proposes a schema change (a "model proposal"), **this setting decides how much approval it needs**. Hermes is served *by* this rule, not a party to it. | n/a | ✅ FIXED |
| **D2-wide — retire the deprecated guard resolver** | **n/a** (pure platform), but **enabling** | Every route the AI will ever reach must run the **registry** guard set. Until this is done, a tool call reaching an enabled module **bypasses the guard set** — which would be an authority bypass for a Hermes call. So D2-wide is a **precondition** for granting Hermes any tool in an affected module. | n/a | **IN PROGRESS** — 161 call sites / 67 files left |
| **D3 — the `escalate` outcome** | **n/a** (pure platform) | The guard result must be able to say *"this needs a human"*, not only allow/deny. That outcome is what a Hermes tool call will receive when a proposed action needs **approval** rather than rejection. | n/a | OPEN |
| **The Metadata Registry** (GAP A / C5) | **n/a** (pure platform) | The declarative registry the AI will *read* to know what objects exist. It is **how Hermes learns the shape of the business** without being handed a database handle. | n/a | OPEN |

**The one-line takeaway for a new developer:** **the foundation items are all "n/a" for Hermes, and
that is the point.** None of them runs an agent — they build the **floor** that makes it safe to run
one later. Doing them first is what lets Hermes arrive without an authority bypass.

### 4.2 The AI-path items (where Hermes is an actor)

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **G-01 — the Business Model Kernel** | n/a | The canonical model Hermes will reason *about*. Hermes reads it through the port; it never holds its own copy. | n/a | ✅ BUILT |
| **G-02 — the Business IR + compiler** | n/a (the target) | **Hermes authors the IR; the platform compiles it.** The AI never writes SQL and never touches the schema directly. | n/a | ✅ BUILT (compiler); Hermes authoring = **PART** |
| **G-03 — User Functions (zero-AI execution)** | n/a | **The decisive joint.** A Function, once published, **runs with no AI at all** — Hermes is *not* in the loop. Hermes only helps *create* it. This is why "all AI goes through Hermes" does not mean "everything calls Hermes at run time." | n/a | ✅ BUILT |
| **G-07 — the Widget contract** | n/a | A published Function, placed in a Widget, runs from the Widget's inputs with **no AI**. Again: Hermes is absent at run time by design. | n/a | ✅ BUILT |
| **G-17 — the AI emits the Business IR** | **Agent** | **This is the first real Hermes joint.** The live model is proven able to emit a schema-valid IR. When Hermes takes the runtime slot, **this is the call that crosses the port**: the platform admits a run, Hermes reasons, the IR comes back, the platform compiles and validates. Today it runs through the platform's own agent path (AI SDK), **not** yet through the Hermes port. | **YES — Llama served the live run** (`Qwen2.5-7B-Instruct-Q4_K_M` via `model:8080`) | ✅ built + measured live; **port rewire OPEN** |
| **G-21 — the request-outcome taxonomy + gate** | **Agent (triage) + wiring (the gate)** | The **triage** decides which of three endings a request gets — a one-time answer, a model proposal (structure change), or a saved Function. The triage is **pure** (no model call, no database). The **gate** that a model proposal must pass is platform authority. Hermes proposes; the platform resolves. | Indirectly (a one-time answer may call a model; a proposal goes through the gate) | ✅ BUILT |
| **G-12 — business backup / restore** | n/a | No AI in the path. Included because it competes for the same slot as G-17 historically. | n/a | not started |

### 4.3 The agent-half items (Hermes is the whole point)

These are the `AH-` items in `BACKLOG.md`, planned in `AGENT-HALF.md`. **For all of them the shape is
"Hermes as an agent", and the wiring is the typed port (§3).**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **The agent runtime** (the port + chat route moved onto it) | **Agent** | **The first thing to build.** The chat route reaches the loop through the port, not through `opencode-client.ts`. OpenCode serves behind it until N-8. **No Hermes capability reaches a user before this exists.** | via the shared LLM registry | DESIGN; the port is **not built** |
| **Agent identity** (`ai_worker` principal) | **Agent + wiring** | The seam **already exists**: `shared/src/lib/auth/principal.ts` exports `aiWorkerSubject()` / `derivePrincipal()`, and a test asserts `{ kind: 'ai_worker', displayName: 'Hermes' }`. The work is to **extend to the five agent kinds and enforce it** — every run carries an `ai_worker` principal **derived server-side**. | n/a | **PART** (seam built) |
| **Tool access to business data** | **Agent** | One door only: `ai_assistant/lib/in-process-client.ts` + `tool-registry.ts` / `tool-executor.ts` / `mcp-tool-adapter.ts`. Every call **re-authorizes against current state**; never a direct database handle. Sprint 0 proved **21 MCP tools** discovered over this boundary. | n/a | **PART** (bridge built) |
| **Authorization of a tool call** | **Agent → Platform** | The enforcement point: `shared/src/lib/authority/{decision,graph,preflight,shadow}.ts` + `auth/api/authority/{delegations,denials,trust}`. **This must be complete before broad tools are granted** — granting tools early is an authority bypass, not a shortcut. | n/a | **PART** (must complete first) |
| **Provider choice and fallback** | **Wiring (platform decides) + Agent (Hermes falls back)** | Hermes may fall back among allowed providers; **the allowlist and the local/cloud rule stay ours** (`model-allowlist.ts`, `llm-provider-registry.ts`). | **YES — Llama is one allowed provider** | **PART** |
| **Sessions, memory, recall** | **Agent** | Our conversation records stay canonical. The Hermes session is a **projection keyed by our ids** (`ai_assistant/lib/session-memory.ts`). Long-lived memory is a **new, tenant-scoped artifact** with consent, export, retention, deletion — **never business truth**. | n/a | **PART** / memory **MISSING** |
| **Scheduling and cron** | **Agent + Wiring** | **Our scheduler owns every business job**; Hermes cron may run runtime chores only. One scheduler over one body of work, or the audit trail is untrustworthy. | n/a | **PART** |
| **Sandbox / terminal / browser / code** | **Agent** | A disposable, quota-bounded, network-policed worker. Highest risk in the whole design. | n/a | **PART** |
| **Subagents and parallel work** | **Agent** | Bounded child runs with budgets, deadlines, cancellation and a trace. | n/a | **MISSING** |
| **Skills (learned procedures)** | **Agent + Wiring** | A governed catalog: provenance, scan, version, approve, pin, roll back, revoke. **This is the "Hermes learns as you go" the owner named** — it must be governed, not ambient. | n/a | **MISSING** |
| **Channels and rooms** | **Agent + Wiring** | Our workspace/room objects own identity and visibility. Hermes channels are adapters, never a second inbox. | n/a | **PART** |
| **Runtime state** | **Agent** | Isolated per tenant and agent, with export, backup, delete and retention. **Disposable and rebuildable — deleting it must never delete a business fact.** | n/a | **MISSING** |

### 4.4 Every other AI-touching item in the log — the map, completed

**Why this section exists.** §4.1–§4.3 cover the items named individually in the build order. The
owner asked for **"every bit of development in our log where needed"** — so this section closes the gap:
**every remaining item in [`BACKLOG.md`](BACKLOG.md) that touches AI at all, grouped, each with its
Hermes/Llama relationship.** Measured 2026-10-06: the BACKLOG holds **43 open items**, of which **~20
touch AI**; the ones below were previously not named in this map. A new developer reading only §4.1–§4.3
would think `AH-1`–`AH-12`, `ML-1`–`ML-4`, `SD-1/2/4`, `G-06`, `S-02`, `N-15`, `V-04` did not exist.

**The rule is unchanged:** *if a human's request has to be understood, it is an agent run; if an admin
turns a knob, it is wiring (§1).* In this section most items are **wiring** — which is the point.

**(a) The structural-permission items — all pure platform, and all *serve Hermes*.**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **SD-1 — the S2 permissions gate** | **n/a** (pure platform) | New data structure may not land until its permissions are decided. **This is the gate a Hermes-proposed schema change must pass** — the AI proposes, the gate decides. Hermes has no way around it. | n/a | OPEN (needs G-04; catalogue startable) |
| **SD-2 — mark core functions, guard deletion** | **n/a** (pure platform) | Functions the platform needs (the roles/permissions manager) ship by default and cannot be deleted. **It bounds what a Hermes run may delete** — an agent cannot remove a core function. | n/a | OPEN (startable) |
| **SD-4 — the structural permission grammar (S11/S12)** | **n/a** (pure platform), but **the language Hermes speaks** | Per object × verb × actor (human/AI) × level. **The `actor = AI` axis is what makes a Hermes call a first-class citizen** rather than a special case: one grammar decides a human edit and an agent edit. | n/a | OPEN (D1 ✅ unblocked the setting it reads) |
| **SD-5 — the manage screen for SD-4** | **n/a** (pure platform) | The surface an admin uses to set the AI axis. Pure wiring — no agent runs. | n/a | OPEN (needs SD-4) |

**(b) The AI-input/output guard and the enforcement point — the two hardest, and both *before* broad tools.**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **G-06 — AI Input/Output Guards + context firewall** | **n/a** (pure platform) — *but it wraps every Hermes run* | **The largest security gap.** These guards inspect what goes *into* and comes *out of* any AI call, and the firewall bounds what context may leave. **Hermes runs behind them: a Hermes run is one of the calls being guarded.** Prompt-injection and data-exfiltration defence lives here, not in Hermes. | n/a | OPEN (needs G-05) |
| **S-02 — wire the resolver as the enforcement point** | **Agent → Platform** | Includes the **responsible-user intersection**: an agent acts **on behalf of** a person, and its authority is the **intersection** of its own and that person's, decided inside the single decider. **This is where a Hermes tool call is actually authorized.** A named warning from the source study: fail closed, or do not ship the switch. | n/a | OPEN |

**(b2) The remaining security/authority G- items — the floor a Hermes run stands on.**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **G-04 — the data-axis authorization layer** | **n/a** (pure platform) | **Not optional before broad tools.** It answers *"may this actor read this row, for this purpose?"* — which is the question a Hermes tool call's authority ultimately rests on. S-02 wires it; this builds it. | n/a | OPEN (startable) |
| **G-05 — classification metadata on entities and fields** | **n/a** (pure platform) | Tags data as personal/secret/regulated so the platform knows **what a Hermes run may not carry out**. The input to G-06's firewall and G-13's controls. | n/a | OPEN (startable) |
| **G-16 — a security-event taxonomy** | **n/a** (pure platform) | Defines the events that must be *recorded*. **A Hermes run's denials, escalations and tool calls land here** — this is where the audit trail for AI behaviour is normalised. | n/a | OPEN (needs G-05) |
| **G-13 — aggregation / inference controls** | **n/a** (pure platform) | Guards against **inference from aggregated results** — the risk that an agent combining many allowed reads learns something no single read was permitted to reveal. An AI-specific control that does not exist anywhere else in the plan. | n/a | OPEN (needs G-04) |
| **G-14 — break-glass and separation of duties** | **n/a** (pure platform) | Exceptional access with its own audit and expiry, and duties that must not collapse into one actor. **Bounds what an agent (and an operator acting as one) may do in an emergency.** | n/a | OPEN (needs G-04) |
| **G-15 — PostgreSQL Row-Level Security** | **n/a** (pure platform) | The **database floor under tenant isolation** (§6.1). Even if the platform mis-scopes a query, RLS is the backstop that keeps one tenant's rows out of another's — the mechanical guarantee behind "the tenant is derived, never declared." | n/a | OPEN (parallel) |

**Not in this map, and why (so the coverage claim is exact).** These open items touch the platform but
**not** Hermes or Llama, so they carry no Hermes row by design: **G-09** (`@`/`#` reference layer),
**G-10** (dependency tracking / change propagation), **G-18** (scheduler enforcement gate), **G-19**
(ERP benchmark), **G-20** (freshness / lineage / linting), and the human-approval / UI items
**22** (bulk approval with a diff), **23** (deputy cover), **15b** (budget as a ceiling), **21c** (a lock
control per record), **24b** (a screen for the two per-tenant authority settings), **C** (a lawyer on
privacy/terms). They may be *used by* a Hermes workflow later, but no AI is an ingredient in them today,
so listing them here would dilute the map rather than complete it.

**(c) The agent-half items not yet in §4.3 — named, grouped, all "Hermes as an agent".**| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **AH-1 — the agent as a kernel object** | **Agent + Wiring** | `kind` (personal · role · context · independent · system), `owner`, `actsAs`, `role`, runtime binding. **This is the object every other `AH-` item hangs off** — the persona/profile mapping the multi-tenancy answer depends on (§6.1). | n/a | OPEN |
| **AH-2 — the responsibility rule** | **Agent → Wiring** | Autonomy per **action class** on the existing `A0`–`A5` gates, so one agent can be `A5` to *filter* and `A1` to *clean*. **The accountable party is always a person.** This is what the platform *sets* and Hermes *obeys*. | n/a | OPEN (needs G-04) |
| **AH-8 — MCP governance** | **Agent + Wiring** | Binding precedence (narrowest-first), changed-tool quarantine, argument-bound approvals. **The policy a Hermes MCP call is judged by.** One measured warning kept: a gateway that an unmanaged client can bypass is a hole, not a policy — so MCP is the *only* door (§6.4). | n/a | OPEN (needs G-04) |
| **AH-11 — ESTOP wired to our own pause** | **Wiring** | One sentinel file, fails safe on corruption. **The global stop that reaches a running Hermes agent.** Depends on nothing, so it can land early. | n/a | OPEN |
| **AH-5 — the room** | **Agent + Wiring** | A first-class shared space: id, participants, agenda, lifecycle, **speaker-labelled** log. Human and agent turns share one record the *platform* owns; Hermes channels are adapters, never a second inbox. | n/a | OPEN |
| **AH-6 — mentions / participants** | **Agent + Wiring** | Pull a specific agent into a thread **without** assigning it work, gated by the same permissions as the room. Pure wiring over the platform's own objects. | n/a | OPEN |
| **AH-7 — hire / fire as a product operation** | **Agent + Wiring** | Not an ops script: creating or removing a Hermes worker is a **product action** with records, permissions and audit. In Hermes terms it is the profile/worker lifecycle (§6.1). | n/a | OPEN (needs AH-1) |
| **AH-9 — skills** | **Agent + Wiring** | Description-indexed, loaded on demand, with a **derived** trust level. **The governed form of "Hermes learns as you go"** (§6.5) — provenance, scan, version, approve, pin, roll back, revoke. | n/a | OPEN (needs AH-1) |
| **AH-12 — the warm-session acceptance test** | **Agent** | Prove the *next turn* sees a write made while the runtime holds the session. **The sibling of session continuity (§4.3)**; it is the test that keeps an implicit session from becoming a silent second source of truth. | n/a | OPEN |
| **AH-3 — the durable wake queue** | **Agent + Wiring** | Every trigger is a **database row**, not an in-memory timer, so a deploy does not lose queued work. **Draws the line between our scheduler and "a second orchestration system inside the product"** (§6.2 / N-15). A wake for a busy agent is coalesced or deferred, never a second concurrent run. | n/a | OPEN (needs S-05) |
| **AH-4 — routines produce work items** | **Agent + Wiring** | schedule → **task** → wake, so every scheduled run has a visible task, a thread and an origin. Our scheduler owns the job; Hermes cron may run runtime chores only. | n/a | OPEN (needs AH-3) |
| **AH-10 — system agents** | **Agent + Wiring** | Admin-created agents that replace or augment a system function (cron, backup, cleanup). **These are Hermes workers acting as platform machinery** — so they carry the same identity, budget and audit rules as any other agent. | n/a | OPEN (needs G-12, G-18) |

**(d) The model-layer track (`ML-`) — all wiring, all *serve* Hermes and Llama.**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **ML-1 — the deployment model record + hardware profile** | **Wiring** | *"Which model runs here, and what fits?"* The platform records it; **Hermes asks for inference and never writes this record.** | **YES — this is the record that names the Llama deployment** | OPEN (trigger: first non-laptop deployment) |
| **ML-2 — the growable model catalog** | **Wiring** | Registered models as **data**, so a new GGUF is recorded rather than code-edited. **The model registry's first real consumer**; Hermes consumes the registry, it does not own it. | **YES — the catalog holds the Llama entries** | OPEN |
| **ML-3 — the platform-driven model swap** | **Wiring** | Update the record, fetch the file, restart the `model` service. **A swap is a restart, not a hot reload** — so a Hermes run in flight must be drained, not migrated mid-run. | **YES — swapping the Llama GGUF is exactly this op** | OPEN |
| **ML-4 — budgets and per-tenant quotas** | **Wiring + Agent** | **Required before any tenant is placed on local inference.** Honest scope (corrected 2026-10-06): a budget **blocks admission** and **pauses the scope**; **cancelling a run already in flight is a separate, best-effort action** and must be named as one. **Do not promise a mid-run kill we have not built.** | Indirect (bounds Llama spend like any provider) | OPEN |

**(e) The two decision items that touch Hermes/Llama and are waiting on the owner.**

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **N-15 — draw the orchestration boundary** | **Wiring (a decision)** | *Where does our scheduler end and "a second orchestration system inside the product" begin?* **This must be written down before AH-3 is built**, or two schedulers run one body of work (§6.2). | n/a | OPEN — **a decision first, then a build** |
| **V-04 — adopt Hermes's ops console beside our own UI?** | **Wiring (a decision)** | **The trigger has fired** (G-07 is built), so this is **due for the owner's decision now**. It is a **host** question: G-07 built the object a host renders, not the host. **The standing rule holds — Hermes is headless (§8.4); if the console is adopted it is a dev/ops surface, never a second identity plane or a customer-facing UI.** | n/a | OPEN — **needs the owner** |
| **The 7 `V`-HOLDs** — V-09 licensing · V-10 multi-agent boards · V-11 computer-use · V-12 locales · V-13 MCPs · S-04 skills | **Wiring / Agent, mixed** | Each is deferred with a trigger. **V-09 (licensing) and V-13 (MCPs) gate Hermes adoption directly** — the licence position is Phase 0's exit gate (§7), and MCPs are the tool door (§6.4). | n/a | HELD (each has a trigger) |

**The one-line takeaway for a new developer, repeated because it is the whole map:** **most
AI-touching items are *wiring* — a setting, a registry entry, a policy row — and the platform is the
actor. A minority are *agent runs*, and every one of those crosses the single typed port (§3).** If you
are unsure which you are looking at, ask: *does a human's request have to be understood?* If yes, it is
an agent; if no, it is wiring.

---

## 5. Llama in particular — the model layer, per joint

**The measured state (2026-10-06):**

- The platform **already owns a model control plane**: `llm-bootstrap.ts` registers presets into
  `shared/src/lib/ai/llm-provider-registry.ts`; `openai-compatible-presets.ts` holds **11 presets**
  (openai, deepinfra, groq, together, fireworks, azure, litellm, ollama, openrouter, requesty,
  lm-studio). The preset file's own header: *"adding a new backend takes one entry in this array, zero
  new adapter files, and zero changes to route handlers."*
- **There is no llama.cpp preset.** Measured by two routes: the 11 ids above, and a search for any
  `localhost:8080` / `model:8080` / `llama-server` entry — none exists. **So "integrate Llama" = add
  one preset entry**, not build an adapter.

**The two measured defects that block Llama tool-calling** (from
[`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §0):

1. The model server command has **no `--jinja`**, without which `llama-server` ignores the `tools`
   parameter — matching the recorded symptom (the model chose a tool and nothing reached the MCP).
   Stated as a claim **with a named test**: read `chat_template` from `http://model:8080/props`.
2. The **MCP service was never given `OPENAI_BASE_URL`** — so the embedding lane calls
   `api.openai.com` with the placeholder key `local` and fails with `invalid_api_key` (blocker B-16).
   Measured: the MCP service's `environment:` block in `docker-compose.fullapp.yml` does **not**
   contain `OPENAI_BASE_URL`, while the app service does.

**How Llama serves / is served, per joint:**

| Joint | Shape | How Llama serves / is served |
|---|---|---|
| The platform's model control plane | **Wiring** | Llama is **one preset entry**. The platform decides which tenant may reach it (the model allowlist). |
| A Hermes agent run | **Agent → Wiring** | Hermes asks for inference; the platform's registry resolves the request to the Llama provider. **Hermes never holds the base URL or a key.** |
| The live IR run (G-17) | **Agent** | Already proven: `Qwen2.5-7B-Instruct-Q4_K_M` on `model:8080` emitted a schema-valid IR 6/6 with a negative control. **This ran through the platform's own agent path, not yet the Hermes port.** |
| The embedding lane | **Wiring** | Blocked today by defect #2 (missing `OPENAI_BASE_URL` on the MCP service). |
| The long-term default | **Wiring (a decision already made)** | **Per-tenant policy is the destination; cloud-first is the interim** (owner, 2026-10-05, model-server §9). This turns three pieces from *nice* to *required*: the model registry, the Hermes agent/persona/profile mapping, and platform-managed local models. |

---

## 6. The challenges the owner named, answered

The owner listed the difficult parts explicitly. Each is answered here, with where the detail lives.

### 6.1 Hermes is "one-tenant-like", the platform is multi-tenant SaaS

**The answer: the tenant is derived, never declared.** Hermes never sees a tenant id it could tamper
with, and never decides one. Every database query, cache key, file root, secret and log line is scoped
from a value **the platform mints server-side** and binds to the run (§3).

**The trap to avoid:** **a Hermes *profile* is not a *tenant*.** A profile is a runtime home (a config
identity and a state directory); a tenant is a **security boundary**. Equating them is the single most
likely way to leak data, because it leaves services, files, caches, subprocesses, logs and MCP
credentials **outside** the boundary it claims to draw. **The profile shape follows the five agent
kinds, not the tenant count** (§5.3 of the integration doc). **Deferred with a trigger:** the profile
topology is decided when the **agent gateway** exists — a topology cannot be tested before there is an
agent to place in one.

### 6.2 Hermes multi-agents

**The answer: bounded child runs with budgets, deadlines, cancellation and a trace.** Our scheduler
owns every business job; Hermes cron may run runtime chores only. Two schedulers over one body of work
produces duplicate execution and an audit trail nobody can trust. Each agent kind (personal / role /
context / independent / system) has its own scope and isolation rules (`AGENT-HALF.md`).

### 6.3 Hermes integrations

**The answer: the platform's authority layer is the integration point, not a Hermes plugin.** A tool
call is authorized at **execution time** against current state; a stale envelope does not resurrect a
revoked permission. The existing in-process tool bridge (`in-process-client.ts`) is the model: it
authenticates **before** it executes, by API key or pre-authenticated auth context.

### 6.4 MCP

**The answer: MCP is the tool door, and it is already half-built.** Sprint 0 proved **21 MCP tools**
discovered by a live agent over the platform's own MCP server/client
(`mcp-server.ts`, `mcp-client.ts`, `mcp-tool-adapter.ts`). **The rule: MCP is the only door to a
business operation** — every call re-authorizes, and there is never a direct database handle in the
runtime. What is missing is not MCP; it is the **runtime behind it**.

### 6.5 "Hermes learns as you go"

**The answer: that is the skills + memory lane, and it must be governed.** Learned procedures become a
**governed catalog** (skills: provenance, scan, version, approve, pin, roll back, revoke); long-lived
memory becomes a **tenant-scoped artifact with consent, export, retention and deletion**. **Neither
ever becomes business truth merely by existing** — retrieval resolves canonical data under
authorization; it does not promote a cached guess into a record. *(This is why "Hermes learns" is a
feature to govern, not an ambient behaviour to trust.)*

---

## 7. The order, stated once — what a new developer should do first

This is the adoption order, and it is **not preference — the product plan sets it.** Hermes is
unnecessary for the business-model spine, security precedes broad tools, and deterministic Functions
never call a model at run time.

| Phase | What lands | Exit gate |
|---|---|---|
| **0. Pin and map** | The pin that does not exist (a recorded source digest + compatibility harness); licence position | A digest is recorded; the harness runs; the licence position is stated |
| **1. The port, with OpenCode behind it** | The typed port; the chat route moved onto it. **No Hermes yet** | The chat works through the port; OpenCode is one implementation behind it; the suite is green |
| **2. One tenant, one tool** | A single Hermes worker, one provider, one narrow tool | Cancellation, retry idempotency, usage capture, bounded CPU/memory, and **no cross-scope access**, proven on one tenant then two adversarial ones |
| **3. Durable sessions and governed tools** | Session continuity; provider fallback; more tools, each authorized | Latency/tokens/CPU measured **against the current assistant** |
| **4. Memory and skills** | Tenant/user-scoped, with provenance, review, version, rollback, export, deletion | Contamination tests pass; a skill cannot widen authority; deletion is real |
| **5. Autonomous work** | Recurring/event work through **our** scheduler and queue | Durable run records, per-tenant budgets, a global stop, deadlines, idempotency, audit |
| **6. Execution environments and channels** | Sandboxed terminal, browser, subagents, messaging | A separate threat model; disposable sandboxes; quotas; network policy; measured cost |

**Where the current build sits in this order:** **Phase 0 is partly done** (D0, D1 fixed; D2-wide in
progress; D3 + Metadata Registry open). **Phase 1 is not started** — the port does not exist and the
chat route is still hard-wired to OpenCode. *The Active task for the session is in the `★ ACTIVE TASK`
box at the top of [`../../JOURNAL.md`](../../JOURNAL.md).*

---

## 8. The four things that must never be possible

The security floor, restated here because it governs every joint above:

1. **A model-widened grant.** Hermes may propose a call; it may not mint or widen authority.
2. **A secret in a prompt, a log or an instruction.** Secrets are *referenced*, never inlined.
3. **A business mutation outside the typed command path and its approval.**
4. **A second identity plane.** No Hermes account, dashboard or pairing flow becomes a way to be
   someone. **Hermes is headless.**

---

## 9. How this map was verified

- **Every path and count in §4 and §5 was read from the source on 2026-10-06**, not from a summary:
  `openai-compatible-presets.ts` (11 preset ids, enumerated), `llm-bootstrap.ts` (registration),
  `docker-compose.fullapp.yml` (the `mcp` service's environment block lacks `OPENAI_BASE_URL`; the
  `hermes` service exists with `nousresearch/hermes-agent:latest`), `api/chat/route.ts` +
  `lib/opencode-handlers.ts` (OpenCode wiring), `principal.ts` (the `ai_worker` seam).
- **§4.4's coverage claim is measured, not asserted:** the BACKLOG was walked for its open-item ids
  (**43 items**), the AI-touching subset (**~20**) was listed, and each was checked against §4.1–§4.3.
  The items that were missing (`SD-1`, `SD-2`, `SD-4/5`, `G-06`, `S-02`, `AH-1`–`AH-12`, `ML-1`–`ML-4`,
  `N-15`, `V-04`, the `V`-HOLDs) are the rows of §4.4. **The earlier version of this file claimed to be
  complete while covering only 11 named items — that claim was false and is corrected here.**
- **The two "no Llama preset" routes share no failure mode:** (1) enumerate the 11 ids; (2) search for
  the base URL / server name. Both agree there is no llama.cpp preset.
- **No status here is assumed.** Where a row says PART or MISSING, that is the integration document's
  measured status, carried forward — and any row that changes must be re-measured before it is
  believed (§"a module is done must be re-measured").

**What this document does not claim.** No performance figure, no throughput, no operational
guarantee — none was measured. The port, the runtime, memory, skills and subagents **do not exist
yet**; they are design.
