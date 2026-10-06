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

### 4.1 The foundation items (Phase 0 — closed before anything is stacked on them)

| Item | Shape | How Hermes serves / is served | Llama | Status |
|---|---|---|---|---|
| **D0 — the guard registry delivers guards** | **n/a** (pure platform) | Hermes is not involved. This is the platform's own authorization floor — **the thing that will authorize every Hermes tool call later**. No agent runs. | n/a | ✅ FIXED, mutation-proven |
| **D1 — tiers/defaults/fallbacks are a setting** | **n/a** (pure platform) | The tier a *structural change* takes. When the AI later proposes a schema change (a "model proposal"), **this setting decides how much approval it needs**. Hermes is served *by* this rule, not a party to it. | n/a | ✅ FIXED |
| **D2-wide — retire the deprecated guard resolver** | **n/a** (pure platform), but **enabling** | Every route the AI will ever reach must run the **registry** guard set. Until this is done, a tool call reaching an enabled module **bypasses the guard set** — which would be an authority bypass for a Hermes call. So D2-wide is a **precondition** for granting Hermes any tool in an affected module. | n/a | **ENABLED MODULES COMPLETE** — **every enabled module is retired**; 106 call sites / 40 files left (was 198), **all in parked modules** (recorded, not migrated) — see §13 |
| **D2-gap — write routes that call NO guard at all** | **n/a** (pure platform), but **enabling — and the stricter half** | The *other* half of the same precondition, and the half that is easy to think is covered. A route here calls **no guard of any kind** — not the registry, not the deprecated pair, not `makeCrudRoute` — so a Hermes tool call reaching it is authorized by **nothing at all**. **"0 remaining on D2-wide" does NOT mean "the module is guarded"**: a module can be finished there and still be wide open here. | n/a | **MEASURED 2026-10-06** across every enabled module: 256 write verbs, **111 unguarded now** (122 before the `communication_channels` tool fix, 143 before the `messages` registry-bypass fix, 158 before the `ai_assistant` fix, 160 before the `audit_logs` fix), 35 modules. Four fixes: `audit_logs` (`4ef5812`), `ai_assistant` (`0af50c8`), a **registry-bypass class** (`messages` + `integrations` + 5 more, `1f1b60e` — not a D2-gap), and a **mis-labelled module** (`communication_channels` — 11 of its 15 verbs were already guarded; the **tool** was the defect). Next-largest remaining**: `auth` (12)** — see §13 |
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

---

# PART II — THE JOINT WORKED EXAMPLES

**Why this part exists.** §4.4 maps every AI-touching item in one or two lines each — that is breadth, and
it is enough to answer *"does this item touch Hermes?"*. It is **not** enough to build one. Part II is the
**depth** the owner asked for: for the handful of items that are the *real joints* — the places a new
developer would otherwise get wrong — a full worked example: the files, the exact functions, the call
order, the traps, and a "done when" test.

**How to use it.** Pick the joint you are building. Read its row in §4.4 for the one-line shape, then read
its section here before you write any code. **Every file path and function name below was read from the
source on 2026-10-06** — if a path has moved, the *shape* is still the guide and the source is the truth.

**The three joints, and why these three:**
- **Joint I — agent identity (`AH-1`).** Every other agent item depends on it. Get it wrong and the
  governance layer silently never engages (this already happened once — see the `ai_worker` story below).
- **Joint II — the tool door + authorization (`S-02` / `AH-8` / the agent runtime).** This is *where a
  Hermes tool call is actually allowed or denied*. Get it wrong and Hermes can widen its own authority.
- **Joint III — "Hermes learns as you go" = skills + memory (`AH-9`).** The owner named this explicitly.
  It is also the most dangerous, because it is the one capability that changes behaviour over time.

---

## 10. JOINT I — agent identity (`AH-1`): the persona behind every run

**The one sentence.** *Every Hermes run is executed as a principal of kind `ai_worker`, derived
server-side from a credential the platform issued, and never named by the runtime.*

**Why it is a joint and not a detail.** The platform's whole governance layer (ceilings, delegations,
trust grants, denials, the approvals queue, the journal, the ledger) **keys off the principal's `kind`**.
If a run arrives as `service` instead of `ai_worker`, every machine-specific ceiling silently fails to
engage — the run is treated as an ordinary API key. That is not hypothetical: the code records that
`ai_worker` was *"a type with no inhabitants"* until a producer existed, and that the effect-class matrix
*"never engaged"* because of it.

**The code as it is today (read this before you change anything):**

| Piece | File | What it does |
|---|---|---|
| The principal type | `packages/shared/src/lib/auth/principal.ts` | `PrincipalKind = 'human' \| 'ai_worker' \| 'service' \| 'system'`. `Principal` carries `id`, `kind`, `onBehalfOfUserId`, `displayName`, `tenantId`, `organizationId`. |
| The producer | same file, `aiWorkerSubject(apiKeyId)` | Builds the subject `ai_worker:<uuid>`. **This is the only thing that makes a principal an AI worker.** |
| The reader | same file, `parseSubject(subject)` | The **single** place that decodes a subject. Nothing else may parse `sub`. |
| The deriver | same file, `derivePrincipal(auth)` | Turns an auth context into a `Principal`. Populated at the auth boundary; also a fallback for pre-existing contexts. |
| The safe accessors | same file, `effectiveUserId` / `isHumanPrincipal` / `isApiKeyBackedKind` / `isMachinePrincipal` | **Use these, never a branch on `kind` in your own file.** They exist to stop the same bug recurring. |

**The four rules that make this joint correct (do not break any):**

1. **Identity is derived, never received.** The runtime must not be able to *name* its tenant, user or
   agent kind. `derivePrincipal` reads them from the credential the platform minted. In the Hermes
   envelope (§3) these fields are marked read-only for exactly this reason.
2. **A new kind is a compile-time question, not a runtime surprise.** When `ai_worker` was added, every
   `kind === 'service'` check became silently incomplete — one (`RbacService`) fell through to the human
   branch and put an `ai_worker:<uuid>` string into a uuid column, producing a 500. **The fix pattern is
   `isApiKeyBackedKind(kind)`**: a named predicate so the next kind is caught by the type-checker.
   *If you add a principal kind, search for every `kind ===` and every `=== 'service'` and make each one
   a named predicate.*
3. **`onBehalfOfUserId` is the responsible human.** An AI worker acts *for* someone; attribution,
   preferences and personal state follow that user id, not the worker's. **This is the same "responsible
   user" idea S-02 wires into the decider** — identity and authorization share one notion of on-behalf-of.
4. **`system` is a machine with no credential.** The platform acting on its own behalf (a CLI, a scheduled
   job). Do **not** look one up in `api_keys` — it is not there. This is why `isApiKeyBackedKind` is
   narrower than `isMachinePrincipal`.

**The agent *definition* is a separate object from the *principal* — do not confuse them.**

| Object | File | It answers |
|---|---|---|
| `Principal` | `shared/src/lib/auth/principal.ts` | **Who is acting** (human / ai_worker / service / system). |
| `AiAgentDefinition` | `packages/ai-assistant/src/modules/ai_assistant/lib/ai-agent-definition.ts` | **What the agent is allowed to do**: `id`, `moduleId`, `systemPrompt`, `allowedTools`, `mutationPolicy`, `readOnly`, `requiredFeatures`, `defaultProvider`, `executionMode`. |
| The registry | `.../lib/agent-registry.ts` | Holds the definitions; `getAgent(id)`, `listAgents()`. Loaded from the generated `ai-agents.generated.ts`, then overrides, then extensions. |

**The five agent kinds referenced in `AH-1`** (personal · role · context · independent · system) are
**not yet in `PrincipalKind`** — `PrincipalKind` currently holds the *authentication* kind (`ai_worker`),
which is one axis, not five. **This is the gap `AH-1` closes:** the five kinds are a *product* concept
(what the agent is for); `ai_worker` is an *auth* concept (what it is). The work is to add the five kinds
to the agent definition and enforce them, while every one still authenticates as `ai_worker`. **Say so
plainly in the code comment when you do it — a future reader will otherwise assume `ai_worker` is the
five kinds collapsed.**

**Done when:**
- A run started by the agent runtime arrives with `principal.kind === 'ai_worker'`, **proven by a test**
  that asserts the derived principal for a worker credential (the existing test asserts
  `{ kind: 'ai_worker', displayName: 'Hermes' }` — extend it, do not replace it).
- The five product kinds are represented on `AiAgentDefinition` and enforced at run admission.
- Every `kind === 'service'` comparison in the codebase has been rewritten to a named predicate
  (grep for `kind === 'service'` and show the count reached zero or a justified exception).

---

## 11. JOINT II — the tool door and its authorization (`S-02` / `AH-8` / the agent runtime)

**The one sentence.** *Hermes reaches a business operation through exactly one door — a tool call that
re-authorizes against current state at execution time — and there is never a direct database handle.*

**Why it is a joint.** This is where "the model cannot widen its own authority" is enforced or lost. Two
mistakes break it: letting the model choose *whether* to authorize (it must not), and authorizing *once at
admission* rather than *again at execution* (a permission revoked mid-run must not still work).

**The code as it is today:**

| Piece | File | What it does |
|---|---|---|
| The door (client) | `.../lib/in-process-client.ts` — `class InProcessMcpClient` | The in-process MCP client. Authenticates **before** executing, by API key **or** a pre-authenticated auth context. |
| The registry / executor | `.../lib/tool-registry.ts`, `.../lib/tool-executor.ts` | Tool lookup and dispatch. Every call re-checks, never trusts a cached envelope. |
| The MCP adapter | `.../lib/mcp-tool-adapter.ts` | Bridges MCP tool definitions to platform tools. |
| The agent policy gate | `.../lib/agent-policy.ts` — `checkAgentPolicy(input)` | **The first gate.** Denies with a typed code before any execution. |
| The authority layer | `packages/core/src/modules/auth/services/authorityEnforcementService.ts` (539 lines) + `shared/src/lib/authority/{decision,graph,preflight,shadow}.ts` | **The second gate.** The single decider. **This is `S-02`'s target and must be complete before broad tools are granted.** |

**The call order (follow it exactly).** From a user request to a business mutation:

```
1. Chat route admits a run  →  platform mints the envelope (tenant, principal, agent, capability grant)
2. Hermes reasons, chooses a tool
3. TOOL CALL crosses back over the port (resolveToolCall)   ← the ONLY path to a business op
4. checkAgentPolicy()      → is the agent allowed this tool? (allowlist, features, mutation policy)
5. authority decision      → is THIS principal allowed THIS op on THIS object RIGHT NOW? (S-02)
6. tool executes           → inside the platform, as the derived principal, on behalf of the user
7. the platform records    → journal, ledger, audit, budget
```

**The traps, named (each one is a real way this joint has been or can be broken):**

- **Trap 1 — authorize at admission only.** An envelope authorized at step 1 says nothing about step 5.
  **Rule: re-authorize at execution.** The code already does this ("every call re-authorizes against
  current state"); do not "optimize" it away.
- **Trap 2 — the model deciding authorization.** A guard or policy must be a **pure predicate** the
  platform runs, never a model output the platform trusts. *(This is the same contract as `MutationGuard`:
  `validate()` reads the payload and returns a decision, no side effects.)*
- **Trap 3 — a direct database handle in the runtime.** If any code path gives Hermes a connection, the
  door is bypassed. **There is no such handle by design** — keep it that way.
- **Trap 4 — fail-open on a missing decision.** If the decider cannot reach a verdict, the answer is
  **deny**, never "allow because unknown". *(Recorded warning from the source study: a "shadow mode" that
  lets a denial fall through to the agent's own decision must be fixed or not shipped.)*
- **Trap 5 — a bypassable gateway is not a policy.** If an unmanaged client can call a tool without
  passing this door, the policy is decorative. **One door, or it is not one.**

**MCP is the door's public name** (see §6.4): Sprint 0 proved **21 MCP tools** discovered over the
platform's own MCP server/client (`mcp-server.ts`, `mcp-client.ts`, `mcp-tool-adapter.ts`). What is
missing is not MCP — it is the **runtime behind it** and the **decider in front of it**.

**Done when:**
- `checkAgentPolicy` and the authority decision both run **on every tool call**, proven by a test that
  revokes a permission mid-run and shows the next call is denied.
- A test sends a tool call whose grant was minted at admission but whose permission was since removed →
  **denied**, not allowed.
- No code path reaches a business entity without passing through `tool-executor` (grep for direct
  repository access from the AI package and show zero).

---

## 12. JOINT III — "Hermes learns as you go" = skills + memory (`AH-9`)

**The one sentence.** *What Hermes learns becomes either a governed **skill** (a reviewed, versioned,
pinnable procedure) or a tenant-scoped **memory** artifact (consented, exportable, deletable) — and
neither ever becomes business truth merely by existing.*

**Why it is a joint, and why it is dangerous.** This is the one capability that **changes behaviour over
time**, so it is the one that can quietly widen what the system does. The owner named it: *"Hermes learns
as you go which means improving the quality of outcomes over time."* That is the goal — **and** it is the
exact place a poisoned or stale learning could take effect without anyone approving it. So the whole
design is: **learning is a candidate, never an authority.**

**The two halves, and they are governed differently:**

| Half | What it is | Where it lives | Governance |
|---|---|---|---|
| **Skills** | A learned procedure, loaded on demand | The platform's own governed catalog (the `AH-9` build) | provenance · scan · version · approve · **pin** · roll back · revoke |
| **Memory** | Long-lived context about a user/tenant | A **new, tenant-scoped artifact** (`.../lib/session-memory.ts` today is the session projection; long-term memory is **MISSING**) | consent · export · retention · deletion |

**The code as it is today (be honest about what exists):**

- **Session memory exists** — `.../lib/session-memory.ts`. It is a **projection keyed by our ids**, not
  the source of truth. Our conversation records stay canonical.
- **A long-lived memory artifact does NOT exist.** Mark it `MISSING`, do not describe it as built.
- **A governed skills catalog does NOT exist.** `AH-9` is the build. *(There may be a tool/agent
  "skills" notion in the runtime used by Hermes itself — that is the runtime's internal mechanism, **not**
  the platform's governed catalog. Do not conflate them.)*

**The five rules that keep learning safe (these are the design; write them into the code as comments):**

1. **A skill is a proposal until approved.** It carries provenance (where it came from), a scan result, a
   version, and an approval. **An unapproved skill never runs.**
2. **A skill cannot widen authority.** Loading a skill must not change the principal, the tool allowlist,
   or the mutation policy. *If a skill could grant a tool, learning would equal privilege escalation.*
3. **Pinning beats learning.** An operator can **pin** a version so a later "improvement" does not silently
   take effect. Roll back and revoke must both be real operations, tested.
4. **Memory is tenant-scoped and disposable.** Export, retention and deletion are **required**, and
   **deleting memory must never delete a business fact.** *(Same rule as runtime state, §4.3.)*
5. **Retrieval resolves canonical data under authorization — it never promotes a cached guess into a
   record.** A remembered value is context for a decision, never the decision's result.

**Done when:**
- A skill can be created, scanned, versioned, approved, pinned, rolled back and revoked — each with a test.
- A test proves a newly-"learned" skill **cannot** add a tool the agent did not already have (rule 2).
- A test proves deleting a tenant's memory leaves every business entity intact (rule 4).
- Contamination tests pass (per §7 Phase 4): a skill from tenant A never reaches tenant B.

---

## 13. The D2-wide walkthrough — the pattern, as a worked example

**Why this is here.** `D2-wide` — the module-by-module retirement of the deprecated guard resolver —
is an AI-touching item, and the pattern must be followed exactly. This is that pattern, end to end,
with the real files. **It is the same shape as Joints I–III: read the source, follow the precedent,
prove by mutation.** *Which* module is in hand is stated **only** in the `★ ACTIVE TASK` box at the
top of [`../../JOURNAL.md`](../../JOURNAL.md); this section is the pattern, not the task.

**What D2-wide fixes.** Routes call `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()`
— both marked `@deprecated` — which resolve **only the single DI-registered service** and **silently
bypass the guard registry**. The replacement is `runRouteMutationGuards()` from
`packages/shared/src/lib/crud/route-mutation-guard.ts`.

**The pattern, proven seven times (`entities`, `data_sync`, `dictionaries`, `dashboards`, `workflows`,
`inbox_ops`, `perspectives`):**

1. **Create a module wrapper** `packages/core/src/modules/<module>/api/mutation-guard.ts` exposing
   `begin<Module>MutationGuard(ctx)` → `{ blockedResponse: NextResponse | null, runAfterSuccess }`.
   Copy the most recent one (`perspectives/api/mutation-guard.ts`) and rename; keep the md5 so you can
   prove you restored it byte-identically.
2. **Repoint the route files**: `const guard = await beginX(...); if (guard.blockedResponse) return
   guard.blockedResponse; ...write...; await guard.runAfterSuccess()`.
3. **Repair the tests**: mock `@open-mercato/shared/lib/crud/route-mutation-guard` (not the deprecated DI
   pair), and re-point the assertions to
   `runRouteMutationGuards(...)` with `{ resourceKind, resourceId, operation }`.
4. **Prove the tests bite** — two mutations, each in a fresh process:
   a. disable the **block path** → the tests must go **RED**;
   b. neuter **`runAfterSuccess`** → the tests must go **RED**;
   c. restore the wrapper and confirm **md5-identical**.
5. **Recount** with the command in `BACKLOG.md` item **D2-wide** (raw grep minus comment lines minus the
   declaration file). **Count calls, not lines** — the two declarations in `mutation-guard.ts` inflate it.
6. **Record** in `BUILD-ORDER.md` §2e and `BACKLOG.md`, and commit **in both repos** (never `git add -A`).

**The current numbers:** **106 call sites / 40 files** — of which **0 calls are in an enabled
module** and **106 are parked**. **Every enabled module is retired** (`entities`, `data_sync`,
`dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`,
`query_index`, `auth`, `directory`, `feature_toggles`). **D2-wide's remaining work is the parked set,
which is recorded — not migrated.** The next task (on the backlog's own order — `D2-gap`, then `D3`,
then the Metadata Registry) is
stated only in the `★ ACTIVE TASK` box** at the top of [`../../JOURNAL.md`](../../JOURNAL.md).

**Two behaviour points to watch** (each cost a previous run something):
- **A route with two mutually-exclusive branches** (from the `dashboards` run): it must create the guard
  **once, before the branch**, and call `guard.runAfterSuccess()` in **whichever branch runs** —
  collecting the guard set once is safe **because `MutationGuard.validate` is a pure predicate**.
- **A route that guards two resources in one request** (from the `perspectives` run): the POST on
  `perspectives/[tableId]` collects a **second**, role-scoped guard when the payload carries role ops.
  Each guard object is evaluated independently and keeps **its own** after-success condition — never
  collapse the two into one, and never let one guard's after-success stand in for the other's.
- **A module may have NO `D2-gap`** — `perspectives` measured all 3 of its write routes guarded. Do not
  assume every module the sweep touches is partially open; **measure it** — and **re-measure it**:
  `D2-gap` is now measured across **all 35 enabled modules** (2026-10-06, `analysis/d2-gap/measure.js` +
  FINDINGS.md): **256 write verbs, 111 unguarded now** (122 before the `communication_channels` tool fix, 143 before the `messages` registry-bypass fix, 158 before the `ai_assistant` fix, 160 before the `audit_logs` fix). Per module, unguarded: `ai_assistant` **9 (fixed `0af50c8`)**, `messages` **0 (fixed `1f1b60e` — registry-bypass, NOT a D2-gap)**, `integrations` **0 (fixed `1f1b60e`)**, `communication_channels` **4 (mis-labelled — 11 of 15 were already guarded; the tool was the defect, 2026-10-06)**, `auth` 12 (now the largest), `business_rules` 11, `inbox_ops` 10, `workflows`
  **10**, `notifications` 10, `attachments` 8, `search` 7, `webhooks` 7, then 4/4/4/4, 3/3, 2, 1/1/1, and
  **0** for `dictionaries`, `feature_toggles`, `perspectives`, `planner`, `query_index`, `translations`,
  `api_keys`. **`audit_logs` is fixed** (`4ef5812`, 2 → 0). **The `workflows` figure this section once
  quoted as "13 of 19" was wrong and is corrected to 10** — the record counted `tasks/route.ts` and
  `events` as unguarded write routes, but neither exports a write verb (checked two ways). **Do not carry
  the old number forward.**

---

# PART III — WHAT PART II DID NOT COVER YET

Part II works three joints in full. The other AI-touching items in §4.4 (the `AH-2`–`AH-12` remainder,
`ML-1`–`ML-4`, `N-15`/`V-04`) get the same treatment **as each comes up the queue** — §4.4 remains their
one-line map until then. When you build one of them and the depth is missing, that is the signal to add
its section here, in the same shape (files → functions → call order → traps → done-when).
