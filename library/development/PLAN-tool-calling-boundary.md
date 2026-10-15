# PLAN — the tool-calling boundary: platform-side resolution of a tool call on the engine chat actually runs on

**Written** 2026-10-15, as the **requirement** (rule 10c) **before any code** (rule 0b: the code was
measured first; every line number below was read from disk this session).

**What this is, in one sentence.** A tool call an AI makes is supposed to pass through **one door** in
the platform — checked against what that run was allowed to do — before it touches business data. That
door is **built and proven**, but **only on the Hermes lane**; on the engine the product actually serves
chat on today (OpenCode), and on the platform's own in-process engine, the same call is **refused as
unsupported**. This plan makes that one path exist on the engine chat runs on.

**Whose decision this is.** The owner chose this as the first thing to plan (2026-10-15), on the
condition he set: it **must not block** his later "AI user as a container" discussion. §6 of this
document shows why it does not — **this work *is* that container's interface**.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-15)

### 1.1 The door and its contract — built

- **The port** — `packages/ai-assistant/src/modules/ai_assistant/lib/ai-runtime-port.ts`. It declares
  eight operations; the one that matters here is
  `resolveToolCall(call: AiRuntimeToolCall, capabilityGrant: string): Promise<void>` (`:364`), documented
  at `:42` as **"the ONLY path to a business operation"**. The grant is **not optional** — the file says a
  tool call without a grant is exactly *"the business mutation outside the typed command path and its
  approval"* the architecture forbids (`:286-296`). The envelope carries `capabilityGrantId: string` as a
  **required** field (`:95`).
- **A tool call** — `AiRuntimeToolCall` = `{ id, toolName, args }` (`:299-306`). **It carries no run id.**
  That single fact shapes the whole correlation design (below).

### 1.2 The two gates — built, pure, complete

- **`lib/ai-tool-call-gate.ts`** (113 lines) — `checkToolCallAdmitted({ toolName, capabilityGrant, run })`
  returns `ok`, or a refusal reason from exactly four: `no_grant`, `foreign_grant`, `no_menu_recorded`,
  `tool_not_in_menu`. It is **pure, total, deny-by-default**, and checks **identity before authority** (a
  foreign grant is refused *before* the menu is consulted, so a foreign caller learns nothing).
  `describeToolCallRefusal(reason, toolName)` (`:102`) turns each reason into one plain sentence.

### 1.3 The one wired implementation — the Hermes lane

- **`lib/hermes-port-adapter.ts:746`** — the **only** production implementation:
  resolve the live run by call id (`:750`, throws if none) → cancel check (`:755`) →
  `checkToolCallAdmitted` (`:759`) → refusal (`:764`) → missing-context guard (`:771`) →
  `this.executeToolCall(call, admittedContext)` (`:782`) → emit `tool-result` on the run's stream
  (`:790-800`).
- **The execution boundary is already a seam**: `HermesToolExecutor = (call, admitted) => Promise<ToolExecutionResult>`
  (`:212`). The default (`executeThroughPlatformToolDoor`, `:225-240`) builds a **fresh request container
  per call** and calls the platform's own `executeTool(name, args, context)` — which itself does RBAC plus
  S-02's responsible-user intersection.
- **The admission rail exists**: `attachRunToolMenu(port, runId, { tools, context })` (`:863-884`) records
  the run's effective tool menu **and a deep-copied snapshot** of the admission-time context (a later
  caller-side mutation cannot widen a recorded admission — the `P2-4` critic's F4 fix).
- **Correlation**: the adapter keeps `toolCallRuns: Map<callId, runId>` (`:274`), filled as `tool.start`
  events arrive (`:471`) and released when the turn ends (`:564-565`).

### 1.4 The two engines that **refuse** the same call — this is the gap

- **OpenCode (the chat/default engine)** — `lib/opencode-port-adapter.ts:467` **throws**. Its own header
  (`:42-45`) states it plainly: *"OpenCode resolves tools **inside itself**; the platform does not resolve
  each call through this door yet… a caller must not believe a tool call is platform-gated when it is not."*
  Its capability map reports `resolveToolCall: false` (`:219`).
- **The platform's own in-process engine** — `lib/agent-runtime-port-adapter.ts:463` **throws**;
  `:245` reports `resolveToolCall: false`; the docstring says *"the platform's loop resolves its own tools
  internally and the port's tool-approval channel is not wired yet."*

### 1.5 Where tool gating happens **today instead** — inside the SDK loop, not at the door

- **`lib/agent-tools.ts`** — the AI SDK tool wrapper `adaptToolToAiSdk` (`:236-320`). It computes
  `requiresApprovalNow` per call (`:252-261`); when true it routes into `prepareMutation` → an
  `AiPendingAction` row plus a `mutation-preview-card` UI part (`:262-281`) instead of executing. Otherwise
  it builds a **fresh container per call** and calls `executeTool` directly (`:305-311`).
- **The authority machinery this rides on is real**: `shared/src/lib/authority/decision.ts:205` caps every
  machine actor at **approve-first** (obligation `:446`; test *"caps an AI worker at approve-first"*,
  `decision.test.ts:180`).
- **But the interception is conditional**: `isMutation === true && canInterceptMutations && input.container`
  (`:413-418`) — i.e. it degrades gracefully to pass-through when the container is absent.

### 1.6 Which engine the product actually runs on

- `lib/resolve-ai-runtime-port.ts:88` — `DEFAULT_ENGINE = 'opencode'`; the hermes branch is documented
  *"not connected here."*
- `docker-compose.fullapp.yml:215` — `AI_RUNTIME_ENGINE: ${AI_RUNTIME_ENGINE:-opencode}`. An `opencode:`
  service exists (`:4-27`) and is in daily use.

**So the honest state, in one paragraph.** The platform **has** a correct two-gate admission check, and it
**has** a correct execution path behind it — both proven live on Hermes (`P2-9a`). The engine that chat
actually runs on **does not use either**; it declines the operation and resolves its tools inside itself.
The platform's own in-process engine likewise declines. Tool authorisation therefore happens **in the SDK
loop** (`agent-tools.ts`) rather than **at the door** — the door's own contract is currently *true of
Hermes and aspirational everywhere else*.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (this plan's own definition):** make `resolveToolCall(call, capabilityGrant)` — the door's declared
*"ONLY path to a business operation"* — a **real path on the engine chat actually runs on**, so that a tool
call the chat engine raises is **checked at the door** (both gates) and executed under the run's
recorded admission, instead of being resolved inside the engine and refused at the door as unsupported.

**Points taken from `platform_points.md` / the architecture that define it:**

- **`ARCHITECTURE-hermes-integration.md` §4.1** — `resolveToolCall(call, capabilityGrant)` is *"the ONLY
  path to a business operation"*. This plan makes that sentence **true on the default engine**, not just
  on Hermes.
- **`ARCHITECTURE-hermes-integration.md` §8, forbidden thing #3** — *"a business mutation outside the typed
  command path and its approval"* must never be possible. The grant requirement and the menu check are the
  mechanical form of that rule; making them fire on chat is the point.
- **`ARCHITECTURE-hermes-integration.md` §8, forbidden thing #1** — *"a model-widened grant. Hermes may
  propose a call; it may not mint or widen authority."* The gate's **narrow-never-widen** property
  (`ai-tool-call-gate.ts:78`) is the enforcement; it must fire identically on every engine.
- **`ARCHITECTURE-hermes-integration.md` §2.3 / §56-65** — *"business truth and authorization [ours];
  Hermes owns runtime mechanics"*; *"Hermes proposes; the platform resolves, authorizes, executes and
  records."* **This is the container seam the owner named** (see §6).
- **Row 28 / `R28-2`/`R28-3`** — the typed door exists and the chat route walks through it
  (`api/chat/route.ts`); the two ✗ operations in the capability map were *named honestly, not papered
  over*. This plan closes one of them **on the default engine**.

**What this plan explicitly does NOT build:** it does not add an engine; it does not touch Hermes; it does
not change `opencode-client.ts` / `opencode-handlers.ts` behaviour; it does not delete OpenCode (`N-8`,
`R28-6`); it does not build memory, skills or models (those are the container discussion). It **wires one
already-built path onto one already-running engine.**

---

## 3. The design (the shape, before the steps)

### 3.1 The one hard problem: correlating a call to its run

`resolveToolCall(call, grant)` carries **no run id** (`:299-306`). The Hermes adapter solves this with a
`callId → runId` map filled from the stream (`:274/:471`). **The chat engine's stream already carries the
same information**: `opencode-handlers.ts:707` emits `{ type: 'tool-call', id, toolName, args }` (the
`id` is OpenCode's own `part.id`), and `:716` emits the matching `tool-result` carrying `tool_use_id`.
So the correlation the Hermes adapter does **can be done identically on the OpenCode lane** — the raw
material is already in the event stream.

**Design rule 1 — reuse the pattern, do not invent a second one.** The call-id correlation, the two-gate
check, the admission snapshot and the execution seam **all already exist in `hermes-port-adapter.ts`**.
The honest build is to **share** them, not to copy them into a second adapter where they can drift — the
same lesson the codebase already banked once, when `ai-runtime-bounds.ts` was created because *"the two
engines cannot drift on what bounded means"* (§2.12).

### 3.2 What "shared" means concretely (a decision the plan must state, not leave implied)

There are two honest options, and the plan picks one:

- **(A) Extract the door's tool-resolution core into one shared module** — a small
  `lib/ai-tool-call-door.ts` holding: the correlation map type, the `checkToolCallAdmitted` call, the
  execution seam type, and the emit-on-sink step — and have **both** the Hermes adapter and the OpenCode
  adapter use it. *(Recommended: one implementation of the only path to a business operation; drift
  becomes impossible by construction. Mirrors `ai-runtime-bounds.ts`.)*
- **(B) Duplicate the resolution logic inside the OpenCode adapter.** *(Rejected: two implementations of a
  security gate WILL drift, and the drift would be silent — the exact failure class `ai-runtime-bounds.ts`
  was created to prevent.)*

### 3.3 The four pieces the plan must produce

| # | Piece | Where | Why it is needed |
|---|---|---|---|
| **P1** | The shared door core | new `lib/ai-tool-call-door.ts` (extracted from `hermes-port-adapter.ts`) | one implementation of the two-gate resolution + execution seam, used by both engines |
| **P2** | OpenCode's `resolveToolCall` becomes real | `lib/opencode-port-adapter.ts:467` | it currently throws; it must run P1 |
| **P3** | The call-id correlation on the OpenCode lane | `lib/opencode-port-adapter.ts` (`streamRun` event handling) | a call must resolve against **its own** run's admission |
| **P4** | The admission rail on the OpenCode lane | `lib/opencode-port-adapter.ts` + its caller | a run must have a **recorded menu** or every call is fail-closed refused (`no_menu_recorded`) — today only Hermes has `attachRunToolMenu` |

**Honest note on P4 (the part most likely to be underestimated):** the gate is **fail-closed** — a run
with no recorded menu may call **nothing**. So wiring P2 alone would make every chat tool call **refused**.
P4 is therefore **load-bearing, not a follow-up**: whoever admits a chat run must record the menu and the
admission-time context, exactly as `attachRunToolMenu` does for Hermes. Where the menu comes from at
admission is **already built** — `resolveAiAgentTools` (`agent-tools.ts:322`) computes the effective tool
set (agent declaration ∩ binding ∩ the acting person's features), and `agent-runtime.ts:1456/:1905`
already call it. **So P4 is a plumbing job, not a design job** — but it must be in the plan or chat
breaks.

### 3.4 What must **not** change (the invariants)

1. **The Hermes lane's behaviour must not move** — the extraction in P1 is a **refactor**, proven by the
   existing `hermes-port-adapter-tools.test.ts` (512 lines, 20+ tests) passing **unmodified**.
2. **The chat behaviour must not change for read-only calls** — a call in the admitted menu executes
   exactly as it does today (fresh container per call, `executeTool`, S-02 preserved).
3. **The mutation/approval path must not be bypassed** — `agent-tools.ts`'s `prepareMutation` interception
   (`:413-419`) is where a mutation becomes a **pending action a human confirms**; the door's
   `resolveToolCall` runs **before** that and must keep handing mutations into the **same** path (the
   door decides *may this call run*, the approval path decides *does a human confirm it*). Two questions,
   one flow — this is also the seam the owner's DP-09 ruling relies on.
4. **The default engine must not move** (`AI_RUNTIME_ENGINE` stays `opencode`); this plan does not touch
   `P2-9b`.
5. **`CC-84` must be addressed in the same change or explicitly sequenced.** `CC-84` (open) records that
   Hermes-served tool calls authenticate as **one service identity**, outside the conversation's
   tenant/user. If OpenCode's lane reuses the admission-context snapshot, the plan must state whether it
   inherits that gap or closes it — **it must not be left silent**.

---

## 4. The steps (small, each independently provable)

Each step: requirement → code → a **separate-agent** hostile critic → **RED-then-GREEN** mutation proof
(md5-restored) → re-measure. The package currently measures **129 suites / 1890 tests green** under the
**pinned Node 24** (`L154`); `tsc` **92 = `CC-73`, 0 new**; both are the baseline every step must preserve.

| Step | What it does | The proof it must carry |
|---|---|---|
| **T1** | Extract P1 — the shared `ai-tool-call-door.ts` core (correlation map, gate call, execution seam, sink emit), and repoint `hermes-port-adapter.ts` at it. **No behaviour change.** | `hermes-port-adapter-tools.test.ts` passes **unmodified**; a mutation that weakens either gate turns it RED; md5-restore. |
| **T2** | Give the OpenCode adapter the correlation (P3): fill a `callId → runId` map from `tool-call` events (`opencode-handlers.ts:707`) and release it when the turn ends. | new tests: a call the live turn raised resolves to its own run; a call no live turn raised is refused; correlation is released at turn end. |
| **T3** | Make `resolveToolCall` real on the OpenCode adapter (P2) using P1. | the four refusal reasons fire identically to Hermes; a call in the menu executes under the admission context; **fail-closed when no menu is recorded**. |
| **T4** | The admission rail on the chat lane (P4): record the menu + admission context for a chat run, from the already-built `resolveAiAgentTools`. | a chat run's menu equals the agent's effective tool set; a tool outside it is refused; the snapshot cannot be widened by the caller afterwards. |
| **T5** | The capability map tells the truth (P2's other half): `opencode-port-adapter.ts:219` reports `resolveToolCall: true` **only once T3 is real**. | a test asserts the map matches behaviour (the `P2-9a` lesson: an honest map is itself a claim to measure). |
| **T6** | One **end-to-end** run on the default engine: a chat turn whose answer needs a platform tool call resolves it **through the door**. | a live-shaped test: the call passes both gates and the result reaches the run's stream — the same shape `P2-9a` proved on Hermes, now on OpenCode. |

**T6 is the exit gate.** Everything before it is preparation; T6 is the sentence *"chat resolves tool calls
through the door"* becoming **measured instead of declared**.

---

## 5. The risks, stated honestly

| # | Risk | Mitigation built into the plan |
|---|---|---|
| **R-a** | **P4 underestimated** → wiring the door without the menu makes every chat call fail-closed. | T4 is a **separate step before T6**, and T3's tests include the fail-closed case explicitly. |
| **R-b** | **The extraction in T1 silently changes Hermes.** | T1 carries **no behaviour change** and is proven by the Hermes suite passing **unmodified**; a mutation proves the gates still bite. |
| **R-c** | **OpenCode's internal tool resolution conflicts with platform gating** — the engine may execute a call before the door sees it. | §3.2's honest boundary: if OpenCode cannot be made to *wait* for the door, the plan must **record that as the measured limit** and scope T6 to what is provable — **not** claim a gating it does not have (the mistake the adapter's own docstring warns against). *(This is the single item that may re-shape the plan; it is a **measurement**, not an assumption.)* |
| **R-d** | **`CC-84` (one service identity) is inherited unnoticed.** | §3.4 invariant 5 — the plan must state inheritance or closure explicitly. |
| **R-e** | **Two implementations drift.** | §3.2 option (A): one shared core, so drift is impossible by construction. |

**On R-c — the honest unknown.** Whether OpenCode's engine can be made to *defer* a tool call to the
platform door (rather than executing it internally) is **not yet measured**, and it is the one fact that
determines how much of this plan is reachable. **The first thing T2/T3 must do is measure it** — and if the
answer is "it cannot defer", the honest outcome is to record that as the engine's own boundary (as the
Hermes pin did for its worker) rather than to claim a gating that is not real. **This plan does not assume
it; it measures it first.**

---

## 6. Why this does not block the owner's "AI user as a container" concept

*(The owner's condition, verbatim, 2026-10-15: **"We can follow your recommendation as long as it does not
block a concept we will need to discuss later which deals with our platform AI user as a 'container' that
integrates the full AI functionality (which includes ai models management, skills, memory, tools, etc…
which is managed by hermes functionality wired in our front end) with none ai functionalities (like
workspaces, tenants, human users, functions, etc… managed within the main platform)."**)*

**The verdict, measured: this work *is* the container's interface — it confirms the concept rather than
pre-empting it.**

- The split the owner describes is **already the platform's stated architecture**:
  `ARCHITECTURE-hermes-integration.md` — *"business truth and authorization [ours]; Hermes owns runtime
  mechanics"*; *"Hermes proposes; the platform resolves, authorizes, executes and records"* (§2.3);
  and §2.2 item 5 — **the model allowlist and the local/cloud rule stay ours** ("Provider choice and
  fallback… Hermes may fall back; the allowlist… stays ours"). That **is** his "models on the AI side,
  tenancy on the platform side" — already documented.
- **The door's own contract names the seam**: `resolveToolCall(call, capabilityGrant)` — *"the ONLY path
  to a business operation"* — is precisely the boundary between **"the AI side proposes"** and **"the
  platform side resolves, authorizes, executes and records."** Making it real on the default engine
  **draws that boundary where he says it should be**, and makes the later discussion **concrete instead of
  hypothetical**.
- **The one caveat, named honestly**: if the container discussion later decides that tools should be
  resolved **inside** Hermes rather than platform-side, that is a **design change to the port contract** —
  **one file** (`ai-runtime-port.ts`), not damage, and not precluded by this work. This plan makes the
  platform-side resolution real *because that is what the contract already says*; if the owner later
  chooses the other seam, the port is the single place the decision lands.

**Therefore: condition satisfied. This is the container's seam, not a competing mechanism.**

---

## 7. The plan in one picture

```
        TODAY (chat / default engine)                 AFTER THIS PLAN
  ┌──────────────────────────────┐           ┌──────────────────────────────┐
  │  chat turn                   │           │  chat turn                   │
  │   └ AI decides a tool call   │           │   └ AI decides a tool call   │
  │       └ engine runs it       │           │       └ THE DOOR:            │
  │          INSIDE ITSELF       │           │          gate 1 grant ✓      │
  │  (platform never sees it;    │           │          gate 2 menu  ✓      │
  │   the door says UNSUPPORTED) │           │          └ execute under the │
  └──────────────────────────────┘           │            recorded admission│
                                             └──────────────────────────────┘
   the two gates exist + are proven              the same two gates, on the
   ONLY on Hermes (P2-9a)                        engine chat actually runs on
```

---

## 8. What happens after this plan is approved (and what does not)

- **On approval:** build T1…T6 in order, each with its own critic and mutation proof, **no step skipping
  its proof**. The plan is the requirement; the code follows only after the owner's go (rule 11 / no builds
  without approval).
- **Not in this plan:** the workspace screen, the two permission gates (`CC-44`/`CC-47`), the
  models/skills/memory container discussion, `P2-9b` (the Hermes default-flip), and `CC-84`'s fix (which
  this plan **must state an interaction with**, per §3.4, but does not itself own).
- **Carried, not done:** the `run.ts` citation defect recorded in `03-MAPPING.md` §5b (four files) — still
  deliberately left for its own pass.

---

*Written 2026-10-15. Owner: Ramzi. Status: **a plan awaiting approval — no code written.** The requirement
it answers: `resolveToolCall` must be real on the engine chat runs on, or the door's "ONLY path to a
business operation" is true of Hermes alone.*
