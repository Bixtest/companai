# PLAN — ROW 28 (Phase 8): the agent runtime sits behind one typed door

**Status: OPEN — measured (rule 0b) 2026-10-11. No code written yet.**
**This plan breaks row 28 into small sub-rows, each with its own status, so it can be built one at a
time — never as one large lump.**

---

## §0. In plain words — what row 28 actually asks for

Today the platform talks to its AI engine in **two different ways, from many places, with nothing in
between**:

- The **chat screen** talks straight to **OpenCode** (a separate AI program that runs in its own
  container). It calls OpenCode by name, directly.
- Another part (the "AI text" route) talks straight to the platform's **own built-in AI runner**.
- A third part (the "run object" route) also talks straight to that built-in runner.

So **there is no single front door**. Every caller has to know *which* AI engine to talk to and *how*.
If we ever change or add an AI engine, every caller must be found and changed by hand.

**Row 28 says: stop that. Give the AI engine ONE front door.** Everything that wants AI talks to that
door; the door decides which engine is behind it. Then changing the engine means changing one place.

**Important:** this is the *shape* work, **not** the Hermes work. Hermes (the new Python AI runtime)
comes later. Row 28's first job is to **build the door and walk the chat screen through it, with
OpenCode still standing behind the door.** This is the order the architecture document already
prescribes: *"rewire first, delete second."*

---

## §1. What exists today — measured in code (rule 0b)

Measured 2026-10-11 by reading the files, not the docs.

| # | What the code does today | Where (file : line) |
|---|---|---|
| 1 | The chat route imports OpenCode's client and its streaming handler, and calls them **directly** | `ai_assistant/api/chat/route.ts` — import at `:10`, `:6–9`; called at `:218`, `:349` |
| 2 | A second AI path calls the platform's own runner `runAiAgentText` directly | `ai_assistant/api/ai/chat/route.ts:688` |
| 3 | A third AI path calls `runAiAgentObject` directly | `ai_assistant/api/ai/run-object/route.ts:186`, `ai_assistant/lib/business-ir-author.ts:160` |
| 4 | The OpenCode client + handlers exist and are the only door today | `ai_assistant/lib/opencode-client.ts` (`class OpenCodeClient` `:123`, `createOpenCodeClient` `:490`); `lib/opencode-handlers.ts` |
| 5 | There is a **client-side** transport, but it is for the browser's chat hook — **not** a runtime door | `ai_assistant/lib/agent-transport.ts` (`createAiAgentTransport`, a `ChatTransport`) |
| 6 | `AiRuntimePort` (`invoke`/`status`/`cancel`) is **only a comment** — no such code | `ai_assistant/ce.ts` (owned by `L-01`/`AH-5`) |

**Conclusion of the measurement:** the row's own sentence is **literally false today** — code reaches
**two different AI engines directly**, through no door at all.

---

## §2. The requirement (the task + its platform points, combined)

**The task (row 28, Phase 8):** *"The agent runtime sits behind one typed door — no other code talks to
it directly."*

**Its platform points** (`platform_points.md` §D HERMES) — all five are `☐` today:

| Point | What it is | Status |
|---|---|---|
| `B-05` | Runtime boundary decided: one typed port; the code has **no** port yet (OpenCode still occupies the slot) | ☐ |
| `Port` (a) | The typed port exists: `describeCapabilities` · `startRun` · `streamRun` · `cancelRun` · `steerRun` · `resumeConversation` · `resolveToolCall` · `completeRun` | ☐ |
| `Port` (b) | The envelope is admitted: identity minted by the server, secrets as **references** (not values), ids kept distinct | ☐ |
| `Port` (c) | Failure is normal: `cancelRun` is bounded and safe to repeat; `completeRun` is safe to replay — **built and now used in production (R28-4)**; the `☐` below is the ROW's box, kept open because the row needs the whole door used | ☐ |
| `N-8` | Displace OpenCode: build the port, move the chat route, **then** delete OpenCode | ☐ |

**Combined, the requirement is:** build the typed front door with the eight named operations and the
envelope rules, move the chat screen onto it with OpenCode standing behind it, and only then (separately)
remove OpenCode.

**The contract is already written for us** — `ARCHITECTURE-hermes-integration.md` §4.1 (the eight
operations), §4.2 (the envelope), §4.3 (failure is normal), §7 ("rewire first, delete second"), and §9
Phase 1 (**"The port, with OpenCode behind it. No Hermes yet."** with exit gate: *"the chat works through
the port; OpenCode is one implementation behind it; the suite is green"*).

---

## §3. The breakdown — sub-rows, each with its own status

Row 28 is one **row** but not one **task**. It is broken into six sub-rows below. **They are built one at
a time**, in order. Each has: what it is, its prerequisite, and its own status.

Status words used: **DONE** · **IN PROGRESS** · **STARTABLE NOW** · **BLOCKED (and on what)**.

---

### R28-1 — The port's shape: the typed front door + its eight operations
**Status: STARTABLE NOW.**

**What it is.** Write the single typed front door — the definitions that every AI caller will use to talk
to an engine. It has the eight operations named in the spec (`describeCapabilities`, `startRun`,
`streamRun`, `cancelRun`, `steerRun`, `resumeConversation`, `resolveToolCall`, `completeRun`) and the
envelope rules (server-minted identity, secrets as references, distinct ids).

**Prerequisite.** None. This is pure new definition work and stands on the existing types.

**Why first.** Nothing else can be built on top of a door that does not exist yet.

**Takes points:** `Port` (a) part, `Port` (b) part.

---

### R28-2 — The first engine behind the door: OpenCode as one implementation
**Status: IN PROGRESS (2026-10-11) — BLOCKED cleared (R28-1 ✅ DONE).**

**What it is.** Wrap the **existing** OpenCode client so it fits behind the new door. OpenCode does not
change and is not removed — it simply becomes one of the things the door can hide. Nothing new is added
to the system; the existing engine just learns to sit behind the door.

**Prerequisite.** R28-1 (the door's shape).

**Takes points:** `N-8` (first half), `B-05`.

---

### R28-3 — Move the chat screen onto the door
**Status: ✅ DONE 2026-10-11 (code `61776eae`).** The requirement and the challenge are below, kept as
written before the code (rule 10); the measured outcome is §7.3.

**What it is.** Change the chat route so it reaches the AI engine **through the door** instead of
importing OpenCode by name. This is the step that makes row 28's own sentence start becoming true.

**Prerequisite.** R28-1 and R28-2 — **both now cleared.**

**Why it matters.** Until this step, the door exists but nobody walks through it — which is exactly the
"capability nobody can reach" trap our rules warn against. This step closes it.

**Takes points:** `N-8` (the move), `Port` (a) completes.

**Exit gate (the architecture document's own words):** the chat works through the door; OpenCode is one
implementation behind it; the test suite is green.

#### R28-3 — the requirement (rule 10, step 3: written BEFORE the code)

**Measured first (rule 0b), 2026-10-11.** `ai_assistant/api/chat/route.ts` is **412 lines**. It reaches
OpenCode **by name** in exactly these places:

| Line | What it does | Which port operation it must become |
|---|---|---|
| `:6–9` | imports `handleOpenCodeMessageStreaming`, `OpenCodeAuthContext`, `OpenCodeStreamEvent` | gone — the route imports the **port**, not the engine |
| `:10` | imports `createOpenCodeClient` | gone |
| `:181` | `writeSSE` typed on `OpenCodeStreamEvent` | typed on the **port's** `AiRuntimeStreamEvent` |
| `:208–212` | builds `opencodeAuth` | becomes part of the **envelope** (identity fields already exist) |
| `:218–221` | `createOpenCodeClient()` → `getPendingQuestions()` for the answer short-circuit | `startRun`/`resumeConversation` path, **or** stays as a documented bypass — see the challenge below |
| `:349–380` | `handleOpenCodeMessageStreaming({message, sessionId, auth, em}, onEvent)` | **`startRun(envelope)` → `streamRun(runId, sink)`** |

**The requirement, in plain words.** *The chat screen must get its answers by asking **the door**, not by
calling OpenCode itself. After this change, a person reading `route.ts` must not see the word OpenCode
anywhere except, at most, one comment saying which engine currently sits behind the door. The behaviour a
user sees must not change at all.*

**Acceptance (each is a measurement, not a tag):**
1. `grep -n "opencode\|OpenCode" route.ts` returns **zero** imports of the engine (comments allowed, and
   recorded as such).
2. The route builds one **envelope** and calls `startRun` then `streamRun`; it never imports
   `opencode-handlers` / `opencode-client`.
3. Every behaviour the current route has is preserved: the `answerQuestion` short-circuit's ownership
   re-check; the ephemeral session key + token injection; the post-`done` binding; the SSE event shapes;
   the rate limit; the `finally` cleanup. **The existing SSE tests must stay green unchanged** — if one
   needs editing, that is evidence behaviour changed and must be justified, not waved through.
4. The suite is green; the door's own tests still pass; typecheck clean.

#### R28-3 — the challenge (rule 9b: challenge the task before executing)

**Challenge 1 — is the `answerQuestion` short-circuit in scope?** It calls `createOpenCodeClient()` **directly**
to resolve a pending question. The port has **no** operation for "list pending questions". Two honest options:
- **(a) Leave it, and register it.** It is a *different* job from "run a turn" — it is a control message about an
  in-flight question. Putting it behind the door means **adding a ninth operation** the architecture document
  does not name, which is a design decision (rule 11 — the owner decides *what*), not a mechanical move.
- **(b) Add the operation now.** Bigger, and it invents contract surface.

**Decision: (a)** — move the **run** path (the row's actual sentence), leave the question short-circuit with a
**named** register entry, and say so plainly. Reason: row 28's sentence is *"no other code talks to it **to run
an agent**"*; the question path is not a run, and inventing a ninth operation in this row would be exactly the
scope-creep my rules warn against. It is registered as **`CC-69`** (below), **not** swept under the rug.

**Challenge 2 — does the port's `startRun`+`streamRun` split fit the route's shape?** The route today passes an
`onEvent` callback into one streaming call. The port splits it: `startRun` returns a `runId`, then
`streamRun(runId, sink)`. That is a **two-call** shape. It fits: `startRun` mints the run (and the adapter
creates the OpenCode session), `streamRun` then streams with the same sink the route already has. The route's
current callback **is** a sink — it needs a trivial adapter, not a rewrite.

**Challenge 3 — the sessionId/binding coupling.** Today the route passes `sessionId` straight through, and on
`done` binds the resolved session id to the api_key row (`:360–376`). Under the port, `sessionId` becomes
`input.sessionId` (the adapter already reads it — that is defect-7b's fix) and the `done` event still carries
`sessionId` on the port's event union. So the binding logic **moves unchanged**. Good — but it must be
**proven** by the existing binding test staying green, not assumed.

**Conclusion of the challenge:** R28-3 is **safe to build as scoped** — the run path moves; the question
short-circuit is registered as `CC-69`; the existing tests are the behaviour contract. **No new contract
surface is invented.**

---

### R28-4 — Prove failure is normal: cancel is safe to repeat, complete is safe to replay
**Status: ✅ IN PROGRESS 2026-10-11 (requirement written below, before the code).**

**What it is.** Make the door behave correctly when things go wrong: asking to cancel twice must be
harmless, and re-sending a "run finished" message must not double-count. This is what the spec calls
*"failure is normal, not exceptional."*

**Prerequisite.** R28-1 (the door's shape) — ✅ DONE. R28-3 (a run path to hang the caller on) — ✅ DONE.

**Takes points:** `Port` (c).

#### R28-4 — the requirement (rule 10, step 3: written BEFORE the code)

**Measured first (rule 0b), 2026-10-11.**

| # | What the measurement showed | Where |
|---|---|---|
| 1 | `cancelRun` / `completeRun` have **no production caller at all** — outside the port, the adapter and their tests, the names do not appear anywhere in the tree | `grep -rn "cancelRun\|completeRun"` → only `ai-runtime-port.ts`, `opencode-port-adapter.ts`, and the two test files |
| 2 | The chat route has **no cancel path** — it never observes a client disconnect and never stops a run | `grep -n "cancel\|abort\|AbortController" api/chat/route.ts` → none on the run path |
| 3 | The **UI already has a Stop button** — and it already aborts something: the hook aborts its own `AbortController` (`fetch(..., { signal })`), which drops the browser's socket | `frontend/hooks/useCommandPalette.ts:1416` (`stopExecution`), `:556–569` (the fetch with `signal`) |
| 4 | **But that client-side abort never tells the server to stop the run.** The route's `(async () => …)()` keeps calling `port.streamRun` and keeps writing SSE events to a writer nobody reads; the engine call runs to completion | `api/chat/route.ts:408–511` |

**The requirement, in plain words.** *Two things must become true. (1) When the user presses Stop — or
simply closes the tab — the server must notice and tell the door to cancel the run, so a run the user
abandoned is not left running and is recorded as cancelled, not completed. (2) Every run that ends — for
any reason: finished, failed, or cancelled — must report its outcome to the door once, so the door has a
record of the run. Asking to cancel a second time must be harmless, and reporting a run finished a second
time must not double-count. A person reading the chat route must still not see an engine named.*

**Acceptance (each is a measurement, not a tag):**
1. The chat route calls `port.cancelRun(runId)` when the request is aborted (the browser closed the
   connection, or pressed Stop), **before** the run is completed.
2. The chat route calls `port.completeRun(runId, result)` **once** at the end of every run, in the
   existing `finally`, with the honest status (`cancelled` when the abort was seen, `completed`
   otherwise) — the door's own record, not a second bookkeeping system.
3. Repeating a cancel is harmless and repeating a completion does not double-count — **proved at the
   route level**, not only in the adapter's own suite (the adapter's replay-safety already has its
   unit tests; what was missing is the *caller*).
4. `grep -n "cancel\|abort" route.ts` shows a cancel path; the route still imports **no engine** and the
   R28-3 static guard still passes; the pre-existing behaviour tests pass **unmodified**.
5. Suite green; route type-checks clean.

#### R28-4 — the challenge (rule 9b: challenge the task before executing)

**Challenge 1 — is a client-disconnect abort the *right* production caller for `cancelRun`, or must
R28-4 wait for a caller with a real cancel affordance?** Measured (row 3 above): the affordance **already
exists** — the UI's Stop button aborts the browser's own socket. So the honest gap is not "there is no
Stop button"; it is **"Stop does not reach the server."** The right caller is therefore *the route
observing the disconnect*, because that is exactly the moment the run should stop, and it covers both
Stop **and** a closed tab with one mechanism. This is not a synthetic caller invented to make a box
tick — it closes a real hole the user can already press a button for. **Decision: build it.**

**Challenge 2 — should the route's cancel be a *new route* (a `POST /cancel`) instead of observing the
disconnect?** Two honest options:
- **(a) Observe the disconnect** (`req.signal`) — one mechanism, no new contract surface, covers Stop
  and closed-tab alike; the client already closes the socket, so **nothing on the front end changes**.
- **(b) Add a cancel endpoint** and have the Stop button call it — a new route, a new client call, and a
  second way to reach the same outcome.

**Decision: (a).** Reason: the client already signals the intent by closing the socket, so (a) needs no
front-end change and no new contract surface, and it cannot be bypassed. (b) would add a route the
architecture document does not name, for the same result — the scope-creep my rules warn against. If a
richer affordance is ever needed (e.g. cancel *without* closing the stream), that is a **new design
decision** and is registered, not improvised.

**Challenge 3 — does `completeRun` duplicate bookkeeping the route already does?** The route already
logs a "Chat complete" line with duration/tokens in its `finally`. `completeRun` is different: it is the
**door's own record of the run** (§4.3's replay-safe completion), the thing a future engine consults to
know a run is done. Adding it is not a second log; it is the run's lifecycle being closed at the door,
which is what `Port` (c) asks for. The route's log stays.

**Conclusion of the challenge:** R28-4 is **safe to build as scoped** — the route observes the disconnect
and calls `cancelRun`; the `finally` calls `completeRun` once with the honest status; no new contract
surface, no front-end change. **The one honest limit** (stated, not hidden): the OpenCode engine's
in-flight HTTP call cannot be force-torn-down from the adapter, so the cancel is **cooperative** — the
run is marked cancelled and the consumer stops being fed; that limit is already documented in the
adapter (R28-2) and is repeated in the outcome below.

---

### CC-67 — Move the two remaining callers onto the door (the change that flips `B-05` and `N-8`)
**Status: ✅ DONE 2026-10-11 (code `6c3db27c`) — see §7.5 for the outcome, proof and the two hostile critics.**

**What it is.** Row 28's own sentence is *"the agent runtime sits behind one typed door — **no other code
talks to it directly**."* R28-3 moved the chat route onto the door. **Two callers still reach the
platform's own engine (`agent-runtime.ts`) directly.** Moving them is what makes the sentence true and
what finally flips `B-05` and `N-8`.

**Prerequisite.** R28-1/2/3 — all ✅ DONE. Its trigger (the chat route proven on the door) has landed.

#### CC-67 — the requirement (rule 10 step 3: written BEFORE the code)

**Measured first (rule 0b), 2026-10-11.** The two callers are **not the same shape as the chat route's**,
and that is the whole difficulty:

| Caller | What it calls | What it passes | What it gets back |
|---|---|---|---|
| `api/ai/chat/route.ts:688` | `runAiAgentText({...})` | `agentId`, `messages` (a full `UIMessage[]`), `attachmentIds`, `pageContext`, `sessionId`, `conversationId`, **`boundScope`**, **`authContext`** (`tenantId`/`organizationId`/`userId`/`features`/`isSuperAdmin`/**`onBehalfOfUserId`**), **`container`** (the DI container), `requestOverride`, `loop`, `emitLoopTrace` | a **streaming `Response`** |
| `api/ai/run-object/route.ts:186` + `lib/business-ir-author.ts:160` | `runAiAgentObject({...})` | `agentId`, `input` (`UIMessage[]` or a bare prompt), `boundScope`, `authContext`, **`container`**, `modelOverride` | a **structured value** (`RunAiAgentObjectResult`) |

**The requirement, in plain words.** *The two remaining callers must reach an engine through the door,
not by importing `agent-runtime` directly. The behaviour a user or a program sees must not change at all.*

**Acceptance (each a measurement, not a tag):**
1. `grep -rn "runAiAgentText\|runAiAgentObject"` in **production** files returns **no** import from
   `agent-runtime` — the names are reached through the door (or the route no longer names them).
2. `api/ai/chat/route.ts`, `api/ai/run-object/route.ts` and `lib/business-ir-author.ts` build a run and
   reach the engine **through the port**.
3. Every behaviour preserved: the policy gate, the binding re-check (`CC-27`), the narrowing (`CC-55`),
   the persistence calls, the SSE shape / the JSON shape. **Existing tests pass UNMODIFIED** — if one must
   change, that is evidence behaviour changed and must be justified.
4. Suite green; the changed files type-check clean.

#### CC-67 — the challenge (rule 9b: challenge the task before executing)

**Challenge 1 — can these two callers honestly sit behind the SAME port as the chat route, with the
OpenCode adapter as the only engine behind it?** No — and this is the decisive measurement. The port's
envelope (`§4.2`) carries **references** (`allowedInputRefs: string[]`), **identity** (tenant/principal/
actor/agent ids) and **nothing else**. `runAiAgentText` needs **three things the envelope cannot honestly
carry**:

1. **The DI `container`** — a live object with database access. Putting it in an envelope (or in an
   allowed-input reference) would be exactly the *"secrets/objects inlined"* §4.2 forbids, and the port is
   types-only with **no runtime dependency** by design.
2. **The full request context** (`acl.features`, `isSuperAdmin`, `onBehalfOfUserId`, `boundScope`) — a
   per-request authorization context. The port's model is: the platform **admits** a run with a
   `capabilityGrantId`, and the runtime acts under it — the grant is an **id**, not the whole context.
3. **`UIMessage[]`** vs the port's opaque `messages?: unknown[]` — the port deliberately does not adopt
   either engine's message type.

**So the two callers are a DIFFERENT ENGINE, not the same one.** The OpenCode adapter sits behind the door
for the **OpenCode engine**; these two callers use the platform's **own in-process AI SDK runtime**
(`agent-runtime.ts`). They are two implementations of one interface — which is the entire point of a port.

**Decision — the honest options:**

- **(a) Write a SECOND adapter (`agent-runtime-port-adapter.ts`) that puts `runAiAgentText`/
  `runAiAgentObject` behind the door, and expose the port's `startRun`/`streamRun` with the rich input
  travelling as an **engine-specific op bag** carried *outside* the generic envelope.** Smaller, and it
  makes the door the only path — but the rich input (the container, the full auth context) genuinely
  cannot be expressed in the envelope, so it travels as a **second argument** to the adapter's own
  factory — i.e. the caller constructs the adapter with its deps, exactly as the chat route does with
  `createOpenCodePortAdapter({ auth, em })`. **This is the honest shape:** the door stays generic; the
  deps ride on the adapter's construction, not inside the envelope.
- **(b) Extend the envelope** to carry a `container`/`authContext`. Rejected — it puts live objects and the
  whole authorization context *inside* the admitted envelope, which §4.2 and §8 forbid, and it would make
  the port depend on runtime objects it deliberately has none of.

**Decision: (a).** The door gains a **second implementation** — an adapter for the platform's own
in-process runtime — and the two callers reach it through the port. The container and auth context travel
on the adapter's construction (per request), exactly like the OpenCode adapter's `{ auth, em }`. **No
envelope field is invented; no live object is inlined into the envelope.**
**And — rule 11 note — this is a *wiring* move, not a design decision:** the port already exists, the
adapter pattern is established (R28-2), and the mapping is mechanical once the split is understood. It does
not need the owner's word; it needs to be done honestly and proven.

**The one honest limit (stated, not hidden).** `runAiAgentText` returns a **streaming `Response`**, not an
event stream. The port's `streamRun` emits `AiRuntimeStreamEvent`s. The adapter must either (i) tee the
response body into port events (a real re-plumbing of the SSE parsing), or (ii) leave the response
un-plumbed for the text path **and register it**. **(i) is the honest build** — a passthrough that keeps
the route's `Response` behaviour and re-frames its SSE as port events; the route then writes the port
events back out, which is exactly what R28-3 did for the chat route.

### CC-67 — design, measured against the CLIENT (rule 0b, extended 2026-10-11)

**What I measured before choosing the adapter shape.** The chat route's `Response` is not free-form SSE:
it is the **AI SDK UI-message stream** (`toUIMessageStreamResponse()`, wrapped by
`injectTaskPlanIntoStream` + `appendLoopFinishToStream`). The front end consumes it with the AI SDK's
`DefaultChatTransport` (`agent-transport.ts:47`) inside `useAiChat`, which reads `data-*` UI-message
chunks. And the route's own `persistAssistantOnStreamCompletion` (`api/ai/chat/route.ts:347`) reads the
same bytes to snapshot the assistant message.

**Consequence — the `Response` must pass through byte-identical.** If the adapter re-framed those bytes
into `AiRuntimeStreamEvent`s and the route wrote *those* back out, the AI SDK client would stop
understanding the stream — a user-visible change. So option (i) is refined precisely:

> **The text adapter TEES the response body.** The route still hands the client the **same `Response`
> object** `runAiAgentText` produced (bytes unchanged, headers unchanged). The adapter *additionally*
> reads a copy of the byte stream to emit port events for the door (so `completeRun` has an honest
> outcome and `cancelRun` has a live thing to stop) — **the tee never mutates what the client receives.**

**So the split is honest and small:**
- `runAiAgentObject` (`run-object` route, `business-ir-author`) returns a **structured value** — it maps
  cleanly onto `startRun` + `completeRun` with an `AiRuntimeRunResult`; no stream to tee.
- `runAiAgentText` (`ai/chat` route) returns a **`Response`** — it maps onto `startRun` + `streamRun`
  (tee → events for the door only) + `completeRun`; the route keeps writing the original `Response`.

**The op bag (how the rich deps travel without touching the envelope).** The adapter is constructed per
request with the same three things the route holds — `container`, `authContext`, `boundScope` (plus
`modelOverride`/`loop`/`emitLoopTrace`/`requestOverride` when the caller supplies them). The §4.2 envelope
carries only identity + references, exactly as the OpenCode adapter does. **The envelope is not extended;
no live object enters it.**

**The route still names `runAiAgentText` in ONE file** (`api/ai/chat/route.ts`) — but the *import* moves
from `agent-runtime` to the new adapter, and the call becomes `port.startRun/streamRun/completeRun` with
the adapter doing the engine call. After this change, `grep "from '.*agent-runtime'"` in production
returns only `src/index.ts` (the package's public barrel — a re-export of the package API, not a caller).

---

### R28-5 — Prove the door is the only way in (nothing else talks to an engine directly)
**Status: ✅ BUILT (2026-10-12, code repo).** The check exists, is green, is type-clean, is mutation-proved
(12 mutations, all RED), and survived a separate-agent hostile critic that found three real defects (all
fixed). Outcome and the honest box reading: **§7.6**.

**What it is.** A check that fails the build if any code besides the door reaches an AI engine directly.
Without it, the door is a suggestion, and the next session can quietly bypass it.

#### R28-5 — the requirement (rule 10 step 3: written BEFORE the code)

**The engines (measured, rule 0b).** Two engine modules exist; "reaching an engine directly" means importing
one of them:
- **`lib/agent-runtime.ts`** — the platform's own in-process AI-SDK runtime (entry points `runAiAgentText`,
  `runAiAgentObject`).
- **`lib/opencode-client.ts` / `lib/opencode-handlers.ts`** — the OpenCode engine (entry points
  `createOpenCodeClient`, `handleOpenCodeMessageStreaming`, `handleOpenCodeHealth`, …).

**The full inventory of production files that import an engine** (`grep` over the whole package,
tests excluded — measured 2026-10-12):

| File | Imports | Class | Verdict |
|---|---|---|---|
| `lib/agent-runtime.ts` | (self) | the engine **definition** | ✅ skip (the thing being reached) |
| `lib/opencode-client.ts` | (self) | the engine **definition** | ✅ skip |
| `lib/opencode-handlers.ts` → `./opencode-client` | OpenCode client | the engine's **own internals** | ✅ skip (same engine) |
| `lib/opencode-port-adapter.ts` | OpenCode handlers | **the door** (adapter #1) | ✅ skip |
| `lib/agent-runtime-port-adapter.ts` | agent-runtime | **the door** (adapter #2) | ✅ skip |
| `src/index.ts` | agent-runtime; opencode-client; opencode-handlers | the package **barrel** (a re-export) | ✅ **named exception #1** |
| `api/chat/route.ts` | opencode-client | the **`answerQuestion`** short-circuit (`CC-69`) — *not a run* | ⚠️ **named exception #2** (`CC-69`) |
| `api/health/route.ts` | opencode-handlers | a **monitoring/health endpoint** — *not a run* | ⚠️ **named exception #3** (**new finding → `CC-71`**) |
| `lib/ai-runtime-port.ts` | *(none — comment-only mentions)* | the port's definition | ✅ skip (no import; comment-stripped) |

> **Premise correction (rule 13), found while writing this requirement.** There are **TWO** chat routes,
> and the plan's first draft named the wrong one:
> - **`api/chat/route.ts`** — the **OpenCode-backed** chat route. Its RUN path already walks through the
>   door (`createOpenCodePortAdapter`), but its **`answerQuestion` short-circuit** still calls
>   `createOpenCodeClient()` **directly** (`:342`) → **this is `CC-69`**.
> - **`api/ai/chat/route.ts`** — the **platform-runtime** route moved by `CC-67`. It imports **NO** engine by
>   name (it reaches the engine only through the port) → it is **not** an exception at all.
>
> The requirement's first draft wrote "the chat route's AI-SDK text path" and located `CC-69` at
> `api/ai/chat/route.ts`; **the code says otherwise**, so the requirement and the check are corrected to the
> file that actually makes the reach (`api/chat/route.ts`). The check now pins BOTH facts — the exception, and
> that `api/ai/chat/route.ts` is **not** one.

**The finding that changed the requirement.** `R28-5`'s own text (written when the row was planned) named
**two** exceptions: the barrel and `CC-69`. Measuring the tree found a **third** production file reaching an
engine by name: **`api/health/route.ts`** calls `handleOpenCodeHealth()` directly. This was **not** known
when the row was planned, and it is the row's own sentence that makes it matter — *"no other code talks to it
directly"*. It is **not** a run, so no binding is needed; and the port **does** already expose a **coarse**
health (`describeCapabilities().health`), but the health endpoint returns a **richer** payload
(`{ status, opencode, mcp, search, url, mcpUrl }`) read by a **live front-end page**
(`AiAssistantSettingsPageClient.tsx:55`). Routing it through the door with the coarse field alone would
**regress the settings page**; giving the port a richer health shape is a **contract change** — a design
decision (rule 11), not a mechanical move. **So it is registered as `CC-71`, not silently filed.**

**The acceptance measurement (what makes R28-5 pass):**
1. A **structural scan** over every production `.ts` **and `.tsx`** file in the package asserts that the
   **only** files importing an engine are: the two engine definitions, the two adapters, the barrel, and the
   **two named exceptions** (`CC-69` chat route, `CC-71` health route). Any **new** engine importer fails the
   check — at the point of change, not in production.
2. The scan **cannot go stale**: a removed exception also fails (the exception list must match reality), and a
   **derivation test** scans `lib/` for files that *define* an engine entry point
   (`runAiAgent*`/`createOpenCodeClient`/`handleOpenCode*`) and requires the declared set to name them all —
   so a genuinely new third engine file fails the build.
3. The scan is **comment-safe** (a commented-out `import … from '<engine>'` is not a hit) and catches **all
   module-edge forms** (`import … from`, multi-line `from`, side-effect `import '<spec>'`, `require('…')`,
   dynamic `import('…')`); each exception is **pinned to the exact engine import it is allowed** (so "an
   exception" cannot become "any import"), and a **self-check test** asserts `.tsx` files really are scanned
   (so the `.tsx` support cannot be silently dropped).

> **Three defects the hostile critic found, all fixed (rule 10f + rule 7 — lesson L132).** The first draft
> (a) walked **`.ts` only** — 36 production `.tsx` files were invisible, so a React component could import an
> engine and pass; (b) detected only single-line `import … from`, missing multi-line imports, side-effect
> imports, `require()` and dynamic `import()`; (c) claimed the engine set was **"derived, not typed"** when
> it was a hard-coded three-element array. (a) and (b) are now fixed and **proved by a mutation that reverts
> each** (T6a/T6b, T5); (c) is now **actually true** — a real derivation test was added (T7), and the header
> states the honest truth (the list is **declared, then checked**). The self-check test in (3) closes the
> residual hole the critic's `.tsx` finding exposed: without it, reverting `.tsx` support would keep the
> suite green (T6 originally proved exactly that).

**Prerequisite.** R28-3 **and** `CC-67` — both ✅ DONE.

**Takes points:** the row's own guarantee (*"no other code talks to it directly"*) — i.e. `B-05` and `N-8`.
**Honest scorer's note:** the guarantee is true **for runs** (every dispatch reaches an engine only through
the door) but **not yet literal** for the two non-run exceptions (`CC-69`, `CC-71`). Whether that flips
`B-05`/`N-8` is the honest question this step must answer — see §7.6 (OUTCOME).

---

### R28-6 — Delete OpenCode
**Status: MEASURED 2026-10-12 — TRIGGER-BLOCKED, and the first draft's shape was WRONG (rule 9b).**
**Not built. This section records the requirement, the challenge, and the honest verdict: it cannot be
built yet, and the reason is not effort — it is that there is nothing to put in OpenCode's place.**

**What it is (the first draft, as written when the row was planned).** Remove OpenCode (its client, its
handlers, its `OPENCODE_URL`) once the chat route is proven on the door.

#### R28-6 — rule 9b: challenge the task BEFORE executing it (2026-10-12, measured in code)

Rule 10(f)/9b says: challenge the task before you build it. I measured first (rule 0b), and the first
draft **fails its own premise.** The finding, in our terms:

**1. "Delete OpenCode" would delete the only working engine.** Measured (rule 0b, 2026-10-12):

- **No Hermes engine exists in our code.** `git ls-files | grep -i hermes` in the code repo → **empty**. There
  is no Python runtime, no worker, no Hermes process — nothing. (`§4` of this plan already says so:
  *"Hermes itself is NOT built here."*)
  *(**Correction 2026-10-12, rule 13 — the phrase "Hermes does not exist" was under-scoped.** The Hermes
  **source** is NOT absent: it sits in the **docs** repo as two gitignored extracts — `library/ai/hermes-agent-main/`
  (the *pinned* copy; 17,201 files, byte-identical to `library/ai/hermes-agent-main.zip`, whose archive comment
  carries the upstream revision `eb044063235fbf7a4e68dd2970ade05dbe637ff3`) and the root `hermes-agent-main/`
  (17,367 files — a **later, different** extract; the two are *not* byte-identical). The measurement above is
  still true and the verdict is unchanged — what is absent is a Hermes **engine behind the door** — but a
  sentence that says "Hermes does not exist" is false in the docs repo's terms, so it is corrected. See
  **`HERMES-PIN.md`**.)*
- **OpenCode is the only engine that can actually answer a chat.** The live chat route
  (`api/chat/route.ts`) reaches it through the door (`createOpenCodePortAdapter`, `:122`, `:536`), and the
  engine runs as a **Docker service the platform points at** (`OPENCODE_URL`, default
  `http://localhost:4096`; `docker/opencode/Dockerfile` + `entrypoint.sh`; wired in every
  `docker-compose*.yml`). The platform's **own** runtime (`agent-runtime.ts`) is a *different* engine used
  by *other* routes (`ai/chat`, `ai/run-object`) — it is **not** a substitute for the OpenCode chat path.
- **The architecture document states the gate verbatim** (`ARCHITECTURE-hermes-integration.md` §11):
  *"**When OpenCode goes.** It is still load-bearing (`api/chat/route.ts` is wired to it), so it stays
  until **N-8** rewires the platform chat. The decision settles *what replaces it*, not *when*."*
  And `§9`'s adoption order puts the replacement engine (**Hermes**) at **Phase 2+**, behind **Phase 0**
  (pin & map) and **Phase 1** (the port — our current state).

**2. So the honest verdict: `R28-6` is a deletion with nothing to delete *to* — it is TRIGGER-BLOCKED on
Hermes, not on effort.** Deleting OpenCode today would remove the only engine that answers a chat and
leave the door standing over a hole. That is exactly what the architecture document's *"rewire first,
delete second"* forbids — and *"second"* here means *after Hermes is wired*, which is **Phase 2+ of a
different workstream**, not this row.

**3. The first draft also under-scoped it (rule 13).** "Its client, its handlers, its `OPENCODE_URL`" is
not the whole of it. Measured, "OpenCode" names **two unrelated things** in this codebase:

| Surface | What it actually is | Does `R28-6` delete it? |
|---|---|---|
| `lib/opencode-client.ts`, `lib/opencode-handlers.ts`, `lib/opencode-port-adapter.ts`, `docker/opencode/*` | **The agent engine** (the thing `R28-6` names) | **YES — when Hermes lands** |
| `shared/src/lib/ai/opencode-provider.ts`, `OPENCODE_*` env names, `api_keys.opencodeSessionId` | **A naming vestige** — the platform's *model-provider* config (Anthropic/OpenAI/Google) and the chat-session binding. **Not the engine.** | **NO** — it is the platform's own model plumbing; deleting it would break the platform runtime |

This matters: a naive "delete everything matching `opencode`" would break the platform's own model
selection. `R28-6`, when it runs, must delete **the engine** and separately re-name the vestige (a
cosmetic follow-up), never confuse the two.

#### R28-6 — the requirement (rule 10 step 3: written BEFORE the code)

**Prerequisite (real, and not met):** OpenCode may only be deleted once a **replacement engine is behind
the door and proven** — i.e. **Hermes, at §9 Phase 2+** of `ARCHITECTURE-hermes-integration.md`, behind
its §8 security gates. **None of that exists.** The row's own earlier note ("Prerequisite: R28-3 +
`CC-67`") is **not sufficient** and is corrected here (rule 13): those prove the *door*, not a
*replacement*.

**What it will be, when its trigger fires** (recorded so the next agent does not re-derive it):

1. The chat run path already reaches **the door** (`R28-3`/`R28-5` — done). Nothing to rewire there.
2. A **second** engine (Hermes) must implement `AiRuntimePort` and be selected by the door.
3. **Then** the OpenCode **engine** files (`opencode-client.ts`, `opencode-handlers.ts`,
   `opencode-port-adapter.ts`), its Docker service, and its `OPENCODE_URL` are removed; every test that
   names them is updated in the same change (rule 10e).
4. The **vestige** (`opencode-provider.ts`, `OPENCODE_*`, `opencodeSessionId`) is re-named separately —
   not deleted.

**Trigger (rule 8):** **Hermes exists and is wired behind the door** (`§9` Phase 2+). Until then this is
**not a buildable task** and must not be started. Registered in `COMPLETION-CALLBACKS.md` as **`CC-72`**.

**Takes points:** none now — `N-8`'s **delete** half cannot move until the trigger fires. (`N-8`'s
*rewire* half is **done** — the door is the only way in for runs, proven by `R28-5`.) This is the honest
reading; the alternative (deleting the only engine) would be a regression, not progress.

#### R28-6 — hostile critic (separate agent, 2026-10-12): the finding SURVIVED

A **separate-agent hostile critic** was asked to **falsify** the verdict (it is convenient to declare work
blocked, so the claim must be attacked). It attacked all five sub-claims and **upheld every one**, each with
a command + output: (`1`) `git ls-files | grep -i hermes` and `find . -iname '*hermes*'` both **empty**, and
no Hermes branch/compose service/flag anywhere; (`2`) the live chat is wired to
`createOpenCodePortAdapter` → `createOpenCodeClient()` → `OPENCODE_URL` (default `http://localhost:4096`),
`docker-compose.yml` defines the `opencode` service; (`3`) the in-process runtime is a **different engine**
(its own adapter header says so: *"the chat route speaks to OpenCode over HTTP/SSE; these two call the
platform's own AI SDK loop in-process"*); (`4`) the vestige is **load-bearing** — `api/route/route.ts:9` and
`settings/route.ts:18` import `shared/lib/ai/opencode-provider`, and `model-factory.ts:48-50` reads
`OPENCODE_PROVIDER`; (`5`) the doc quoted verbatim. **Verdict: "SOUND — no safe path to build `R28-6`
now."**

**The one alternative the critic named (recorded, not buried).** The chat run path *could* be pointed at the
platform's own in-process runtime instead of OpenCode — but that is a **behavioural rewrite** (SSE-events vs
an AI-SDK `Response`), and it is exactly **`N-8`'s** charter (*"rewire the platform chat"*), **not**
`R28-6`'s. Doing it today would **pre-empt `N-8`** and pick the engine before the Hermes decision. So the
order stands: **`N-8` (rewire, when a replacement exists) → `R28-6` (delete)**.

---

## §4. What is NOT in row 28 (so nothing is assumed)

- **Hermes itself is NOT built here.** No Python runtime, no new engine. Row 28 ships the door with the
  *existing* engine behind it.
- **No new AI engine is added.** Row 28 must keep the count at two engines, never three. Adding Hermes is
  Phase 2+ of the architecture document, behind the security gates.
- **The "AI text" and "run object" paths** (`§1` rows 2 and 3) are **not moved** onto the door by row 28.
  They are separate callers; the door's guarantee eventually covers them, but each is its own step. Their
  move is registered separately (see `CC-67`, below).

---

## §5. Impact — what this change can touch (rule 10e)

| Touched | Risk | Control |
|---|---|---|
| `api/chat/route.ts` (the live chat screen) | High — this is a working, user-facing path | Walk it through the door **without changing behaviour**; prove the suite green; the door wraps OpenCode unchanged |
| `lib/opencode-client.ts` / `opencode-handlers.ts` | Low — not modified in row 28, only wrapped | No edits until R28-6 |
| The two other AI paths (`runAiText`, `runAiObject`) | None in row 28 | Explicitly out of scope (`§4`); registered as `CC-67` (now **✅ DONE**, §7.5) |
| Any test that asserts the chat route imports OpenCode by name | Medium — the import moves | Find and update them in the same change (rule 10e) |
| `ce.ts`'s comment-only `AiRuntimePort` | Low — a false "it exists" statement | Correct it in the same change (rule 13) — **NOT done during R28-1; found by the 2026-10-12 completeness audit and fixed then** (code `b8f53cb0`): the comment still said the port *"is `L-01`/`AH-5`"* (unbuilt, owned elsewhere) with the stale ops `invoke`/`status`/`cancel`, though the port has existed since R28-1. Now states the truth (the port exists; this file only *names* the runtime; the wiring is `R28-3`/`R28-4`/`CC-67`). **Lesson `L134`.** |

---

## §6. Registration (rule 8)

Every sub-row that ends less than fully done gets (or keeps) a row in `COMPLETION-CALLBACKS.md`:

- **`CC-67`** (new, this plan) — **the two other AI paths still call an engine directly.** Rows 2 and 3
  of §1 (`api/ai/chat/route.ts:688`, `api/ai/run-object/route.ts:186`) are not moved by row 28.
  **Trigger:** when R28-3 has proven the door on the chat route. — **✅ DONE 2026-10-11** (code `6c3db27c`):
  a second adapter (`agent-runtime-port-adapter.ts`) puts the platform runtime behind the door and all three
  callers walk through it (§7.5).
- **`CC-66`** (existing, row 27) — unchanged; not this row.
- **`CC-69`** (new, R28-3) — **the chat route's `answerQuestion` short-circuit still calls OpenCode
  directly.** It is not a run (the port has no such operation); registered rather than hidden.
  **Trigger:** when the port's contract is next extended, or when Hermes lands.
- **`CC-70`** (new, R28-3) — **the run's `capabilityGrantId` is carried but not consumed.** The OpenCode
  adapter does not read it (it resolves tools internally and reports `resolveToolCall` ✗). **Trigger:** the
  first engine that implements `resolveToolCall` (Hermes, §9 Phase 2+).
- **`CC-72`** (new, R28-6) — **`R28-6` (delete OpenCode) is TRIGGER-BLOCKED: it would remove the only
  engine.** Measured 2026-10-12: no Hermes **engine** is wired in our code (the Hermes **source** *is* in the
  docs repo — two gitignored extracts; corrected, rule 13 — but nothing behind the door); OpenCode is the only
  engine that answers a chat. **Trigger:** a Hermes engine exists and is wired behind the door (architecture
  §9 Phase 2+). See §8 below.
- **`N-8`'s second half** (delete OpenCode) — stays open and **trigger-blocked** (`CC-72`), with the trigger
  named in §8 R28-6.

---

## §7. OUTCOME

*(Filled with measured evidence per sub-row, per rule §2.1: every claim carries an observation, and the
"done" is a measured claim, not a tag.)*

| Sub-row | Status | Evidence |
|---|---|---|
| R28-1 | ✅ **DONE 2026-10-11** | See §7.1 below. |
| R28-2 | ✅ **DONE 2026-10-11** | See §7.2 below. |
| R28-3 | ✅ **DONE 2026-10-11** | See §7.3 below. |
| R28-4 | ✅ **DONE 2026-10-11** | See §7.4 below. |
| `CC-67` | ✅ **DONE 2026-10-11** | See §7.5 below — the platform runtime behind the door; the last two callers moved. |
| R28-5 | ✅ **DONE 2026-10-12** | See §7.6 below — the door is proven the only way in (`door-only-way-in.test.ts`, 11 assertions, 12 mutations RED); `B-05` ticked. |
| R28-6 | ⛔ **TRIGGER-BLOCKED — MEASURED 2026-10-12** | See §8 below — Hermes does not exist; deleting OpenCode would remove the only engine. Registered as **`CC-72`**. |

### §7.1 R28-1 — the port's shape — BUILT (2026-10-11, code repo)

**What landed.** `packages/ai-assistant/src/modules/ai_assistant/lib/ai-runtime-port.ts` — **definitions
only, no imports at all** (proven: a grep for any `import`/`require` returns none), so no caller drags an
engine in behind the types. It declares:

- **The envelope** (`AiRuntimeEnvelope`) with all the §4.2 fields, including **`capabilityGrantId`**;
- **A secret reference** (`AiRuntimeSecretRef`) = `scope` + `name` (+ `purpose`) — **no field that can hold
  a value**;
- **The eight operations** in `AiRuntimePort`, each signature keeping every argument §4.1 names — notably
  **`resolveToolCall(call, capabilityGrant)`** (§4.1's *"ONLY path to a business operation"*) and
  **`completeRun(runId, result)`**;
- **Results that are values, not exceptions** — `AiRuntimeCancelResult` (with its four reasons) and
  `AiRuntimeCompleteResult` (replay-safe), plus `AiRuntimeRunResult` carrying usage **with its scope
  stated** and an unknown provider **left unknown** (§4.3).

**Proof.** `ai-runtime-port.test.ts` — **9 tests green**; `tsc --strict --noEmit` clean on both files;
and the **whole package suite green: 112 suites / 1527 tests** (two consecutive full runs, rule 4).
**Six RED-then-GREEN mutations**, each restore md5-verified:

| Mutation | Result |
|---|---|
| rename the implementation constant | caught (2 tests RED) |
| make `turnId`/`conversationId`/`capabilityGrantId` optional | caught — `tsc` TS2322 |
| add `value?: string` to the secret ref | caught — `tsc` TS2322/TS1360 (the key-exactness guard) |
| add `authorityOverride?` to the envelope | caught — `tsc` TS2322/TS1360 |
| drop `capabilityGrant` from `resolveToolCall` | caught — `tsc` TS2322 |
| drop `result` from `completeRun` | caught — `tsc` TS2322 |
| break the event sequence assertion | caught (1 test RED) |

**A hostile critic (separate agent) found THREE real defects, all fixed in-batch.** This is the honest
headline of R28-1:
1. **The port dropped `capabilityGrant`** — I had named the eight operations but not matched the
   document's signatures, and §4.1 calls the grant *"the ONLY path to a business operation."* **Fixed:**
   the grant is now a required argument of `resolveToolCall` **and** a required field
   (`capabilityGrantId`) of the envelope.
2. **The envelope was missing fields** §4.2 lists (schema version, task id, policy/model versions,
   deadline, budget, correlation id…) and had no signature-faithful `streamRun(runId)` /
   `resumeConversation(binding, input)`. **Fixed:** the envelope and every signature now follow §4.1/§4.2.
3. **The tests were weaker than they looked** — the secret-ref and identity checks asserted on an
   *instance's* keys, so an added *optional* field passed silently (the critic proved it with an
   `authorityOverride` mutation that stayed GREEN). **Fixed:** added a type-level `IsExactKeys` guard, so
   an added field — optional or not — now fails `tsc`. Re-run: the same mutation is now **caught**.

**Also met and registered:** a **flaky test** (`mcp-dev-key-resolution`, ~1 full-run-in-3, green in
isolation) — **not** caused by this change (which is additive only; `git diff --stat` empty), registered
as **`CC-68`** per rule 9a.

**No box moved.** `B-05`/`Port` are about the door being *used*; a door nobody walks through yet does not
complete them — that is R28-3. **ONE NUMBER unchanged 75 / 321 = 23%.**
*(The five partial-credit sub-points §D lists — `Port (a)/(b)/(c)` — stay `☐` for the same reason.)*

**★ NEXT = sub-row R28-2** — fit OpenCode behind the door, unchanged.

---

### §7.2 R28-2 — OpenCode behind the door, unchanged — BUILT (2026-10-11, code repo)

**What landed.** `packages/ai-assistant/src/modules/ai_assistant/lib/opencode-port-adapter.ts` — the first
engine behind the door. It implements all eight operations of `AiRuntimePort` and delegates to the
**existing, unmodified** OpenCode engine (`createOpenCodeClient`, `handleOpenCodeMessageStreaming`).
`opencode-client.ts` and `opencode-handlers.ts` are **not touched** — that is the whole point of the step:
the engine moves behind the door *unchanged*, so the door is proven useful before anything is rewritten.

**Measured surface first (rule 0b):** the client is 495 lines, the handlers 957; the handlers expose
`handleOpenCodeMessageStreaming(request, onEvent)` taking `{ message, sessionId?, model?, auth?, em? }`,
which is what the eight port operations are mapped onto.

**The honest capability map** (a door that claims more than it can do is worse than no door):

| Operation | State | What it does |
|---|---|---|
| `describeCapabilities(runtimeVersion)` | ✅ | reports the real map below, per operation |
| `startRun(envelope)` | ✅ | creates an OpenCode session; mints the run id server-side |
| `streamRun(runId)` | ✅ | forwards engine events; **cooperative** cancel honoured between events |
| `cancelRun(runId)` | ✅ | **cooperative** — aborts the live request(s); returns a value, never throws |
| `steerRun(runId, instruction)` | ✗ | **unsupported** — OpenCode has no mid-run steering; throws a named error |
| `resumeConversation(binding, input)` | ✅ | resumes by session id, minting a **fresh** run id |
| `resolveToolCall(call, capGrant)` | ✗ | **unsupported** — OpenCode resolves tools internally; §4.1's *"only path"* is *not* served by this engine |
| `completeRun(runId, result)` | ✅ | replay-safe: completing twice returns the same verdict |

The two ✗ rows are not holes swept under the door: they are **stated in the adapter's own header** and
**reported by `describeCapabilities`**, so a caller can never be surprised.

**Proof.** `__tests__/opencode-port-adapter.test.ts` — **22 tests green**; `tsc --strict --noEmit` clean on
both files; and the **whole package suite green: 114 suites / 1552 tests** (the R28-1 baseline was
112/1527). **Fifteen RED-then-GREEN mutations** (10 build + 5 critic-defect), each restore md5-verified
against `4c1734738243256c7272705b97ba1c75`.

**A hostile critic (separate agent) found SIX real defects, all fixed in-batch.** This is the honest
headline of R28-2 — the first draft *looked* finished and was not:
1. **A defeated abort slot.** `run.abort?.abort()` was defended by nothing — a cancel before a stream
   started was a silent no-op. **Fixed:** a **Set** of `AbortController`s, and `cancelRun` aborts **every**
   one of them, so *"a second stream was never cancelled"* cannot happen.
2. **`cancelRun` after `completeRun` was order-dependent** — the outcome depended on which flag the code
   happened to read first. **Fixed:** `completed` is checked **first**, so the answer is the same in any
   order (and a completed run is never reported as cancelled).
3. **Run = conversation.** The resume run id was `conversationId:agentId:resume`, so two resumes of the
   same conversation shared one run id. That breaks §4.2's rule that *"a run is not a transcript"*, and it
   silently broke replay-safety: two distinct runs were indistinguishable. **Fixed:** `resumeConversation`
   now **mints a fresh, distinct run id** each time.
4. **The stale capability grant.** A second resume of the same conversation kept the **first** grant,
   so the run would have carried an authority it was not issued. **Fixed:** a new grant is taken per resume.
5. **An unchecked cast.** `input.sessionId as string` would have accepted a number, an object, or `null`
   and passed it to the engine as if it were a session id. **Fixed:** a validated `readSessionId` accessor
   that returns `null` unless it is a non-empty string.
6. **Concurrent streams shared one abort slot** — the same root as defect 1, but a distinct symptom:
   cancelling one stream could leave a sibling running. **Fixed** by the same Set.

Every one of the six carries its **own regression test**, and each regression test is itself
mutation-proved (delete the fix → that test goes RED).

**No box moved.** `B-05` / `N-8`'s first half are about the door being *used*; an unused door with an engine
behind it still completes nothing — that is R28-3. **ONE NUMBER unchanged 75 / 321 = 23%.**

**★ NEXT = sub-row R28-3** — move the chat route onto the door. **This is the row's exit gate**
(*"the chat works through the port"*), and it is the change that finally moves `B-05`.

---

### §7.3 R28-3 — the chat route walks through the door — BUILT (2026-10-11, code `61776eae`)

**What landed.** `packages/ai-assistant/src/modules/ai_assistant/api/chat/route.ts` (412 → 445 lines) now
reaches the AI runtime **through the port**:

- it imports `../../lib/ai-runtime-port` and the adapter **factory**, and **not** `opencode-handlers` /
  `opencode-client` for the run path;
- it builds one `AiRuntimeEnvelope` (server-minted identity; the run id **distinct** from the conversation id
  per §4.2) and calls `port.startRun(envelope)` → `port.streamRun(runId, sink)` — the route's existing
  callback is the sink;
- `opencode-client.ts` and `opencode-handlers.ts` are **not modified** (the engine moves behind the door
  *unchanged*).

**One real defect found by my own mutation battery (M5), and fixed.** The first draft minted the run id from
the request start time alone, so **two runs inside the same millisecond would share a run id** — and the
adapter treats a repeated run id as an *idempotent re-start*, so the second run would silently never stream.
Fixed by `mintChatRunId(conversationId, startedAt)` (exported, so its two guarantees are tested directly): a
legible id `<conv>:<engine>:run-<t>-<seq>` with a monotonic counter.

**One registered bypass, stated plainly.** The `answerQuestion` short-circuit **still calls OpenCode
directly** — answering an in-flight question is **not a run**, and the port's contract has no such operation;
adding a ninth one is a **design decision** (rule 11), not a wiring move. It is registered as **`CC-69`**, not
swept under the rug.

**Proof.** `chat-route-through-port.test.ts` — **15 tests green**. The mock boundary is the **engine**, below
the door, so these fail if the route ever calls the engine directly again. Includes a **static guard** that
asserts the *imported symbols* (not a line substring) and bans `require()`/dynamic `import()`, with a
**self-test** proving the guard catches what it claims. The pre-existing `chat-route-ownership.test.ts`
(**8 tests**) passes **unmodified** — the behaviour a user sees did not change. Route type-checks clean;
the **whole package suite green: 115 suites / 1567 tests** (R28-2 baseline 114 / 1552); **9 RED-then-GREEN
mutations** (M1 the direct import; M1b a hidden `require`; M2 streamRun removed; M3 the text ref dropped;
M4 the session dropped; M5/M5b the run-id schemes; M6 the binding removed; M7 the tenant guard removed),
route restored **md5-identical** (`3d6c71620765caba9cd68c87e5295214`).

**A hostile critic (separate agent) found FOUR real defects, all fixed in-batch.** This is the honest
headline of R28-3 — and two of the four were in *my tests*, not the code:
1. **The static guard was evadable** — it whitelisted any import line *containing* `createOpenCodeClient`, so
   a line importing **two** symbols (the whitelisted one **and** the engine) passed. It also missed
   `require()` / dynamic `import()`. **Fixed:** the guard now parses each import statement's **symbol list**
   and bans the other module-loading forms; a self-test proves it catches the exact case that previously
   passed.
2. **The run-id "uniqueness" test was vacuous** — it only asserted `a !== b`, which *any* scheme (even
   `Math.random()`) satisfies. **Fixed:** it now asserts the id **shape** and a **monotonic increment**.
3. **The counter's stated motivation was false** — I wrote that it prevented a cross-request collision, but
   the adapter is constructed **per request**, so that collision cannot happen; and the counter does not
   survive a reload or span instances. **Fixed:** the comment now states the honest limit (the id is
   collision-proof as a property of itself; that safety is not process-global).
4. **A latent fail-open and a placeholder** — `tenantId: ''` would read as "no restriction" to a future
   engine (the adapter happens not to read it *today*), and the capability grant was a meaningless
   `chat:<userId>`. **Fixed:** a missing tenant now **fails closed** (tested); the grant is a real per-turn
   value, and its **non-consumption** is registered as **`CC-70`**.

**No box moved — and that is the honest outcome.** R28-3 is the row's *exit gate*, so it is tempting to tick
`B-05`. But the row's own sentence is *"**no other** code talks to it directly"*, and **two other callers
still do** (`CC-67`) plus the registered bypass (`CC-69`). The door is now **used** — real, measured,
proven — but a door one caller out of three uses is not yet the row. `B-05`, `N-8` and the three `Port` boxes
keep their `☐` **on purpose**; §D's text was re-worded to say exactly what is built. **ONE NUMBER unchanged
75 / 321 = 23%** (re-derived, two routes).

**★ NEXT = sub-row R28-4** — give `cancelRun`/`completeRun` a production caller (so the third `Port` box can
flip), then **`CC-67`** (move the two remaining callers — the change that finally flips `B-05` and `N-8`).

---

### §7.4 R28-4 — the run is closed at the door (cancel + complete) — BUILT (2026-10-11, code repo)

**What landed.** `packages/ai-assistant/src/modules/ai_assistant/api/chat/route.ts` now **ends** every run
at the door, and it is the first change that gives the port's `cancelRun` and `completeRun` a **production
caller** (before this they had none — measured, `§R28-4` requirement):

- a new exported helper **`closeChatRun(port, runId, outcome)`** — the ONE place a run is closed. If the
  run was aborted it calls `port.cancelRun(runId)` **first**, then always calls
  `port.completeRun(runId, { status })` with the honest status (`cancelled` when the abort was seen,
  `completed` otherwise). Cancel-before-complete is what makes a cancelled run record `cancelled`: the
  adapter checks `completed` first, so completing first would freeze the run as completed and the cancel
  would then be a no-op;
- in `POST`'s background block: a hoisted `runId`, an `aborted` flag, a listener on the **request's own
  abort signal** (`req.signal`, `{ once: true }`, with an `aborted`-already check first), and a call to
  `closeChatRun` in the existing `finally`.

**Why the abort signal is the right caller (the challenge, answered).** The chat UI **already has a Stop
button** — `frontend/hooks/useCommandPalette.ts:1416` (`stopExecution`) aborts the browser's own fetch
(`:556–569`, `signal: controller.signal`). So the affordance existed; the gap was that **Stop never
reached the server**. Observing `req.signal` closes that hole for Stop **and** a closed tab with one
mechanism, and needs **no front-end change**. A separate `POST /cancel` route was rejected: it invents
contract surface the architecture document does not name, for the same result.

**The one honest limit (stated, not hidden).** The cancel is **cooperative** for the engine behind the door
today: `cancelRun` marks the run cancelled and the consumer stops being fed further events, but the adapter
holds no handle to force-tear-down the engine's in-flight call (adapter header, R28-2). This change does not
pretend otherwise.

**Proof.** `__tests__/chat-route-cancel-complete.test.ts` — **8 tests green** (the mock boundary is the
**port**, so the route's lifecycle calls are observed in the order it makes them). The pre-existing
`chat-route-ownership.test.ts` (8 tests) and `chat-route-through-port.test.ts` (15 tests reported, including
the R28-3 static guard) pass **unmodified** — the behaviour a user sees did not change. Route type-checks
clean; the **whole package suite green: 116 suites / 1575 tests** (R28-3 baseline 115 / 1567). **6 RED-then-
GREEN mutations** (M1 cancel removed; M2 complete removed; M3 order flipped complete-before-cancel; M4 status
hardcoded `completed`; M5 the abort listener removed; M6 `closeChatRun` skipped in `finally`), each restore
**md5-verified** against `2b1439c43e8acd983c12cc4fd3fdff30`.

**A hostile critic (separate agent) found NO real defects — every claim survived.** It attacked all six
claims with its own probes and reported **none broken**, and it *added one probe of its own* which it then
deleted: **a run that never streams is still closed** (`startRun` throws → the `finally` still completes
it). That probe was correct, so it is now a **permanent test** (rule 15 — do not leave a good check in a
temp file), and it is itself mutation-proved (gate the close on "streaming was reached" → that test alone
goes RED). Two minor notes it raised, both honest and both addressed: (a) the abort listener is never
*removed* — bounded by `{ once: true }` and harmless (the closure keeps only the `aborted` flag), so no
action; (b) my *prompt to the critic* said "15 tests" for `chat-route-through-port` when the file has 17
`it(` blocks (jest reports 15, two being nested/conditional) — a miscount in the prompt, not the docs; the
docs are corrected here to say "15 tests reported".

**No box moved — the honest outcome.** `Port` (c) asks for the *behaviour* (cancel bounded and repeatable;
complete replay-safe). It is now true **and used in production** — but `Port` (c) as a point sits with
`Port` (a)/(b) under the row's own sentence, and the row is not whole while **two other callers still reach
an engine directly** (`CC-67`). `Port` (c) **could** be argued to completion on its own merits; it is left
`☐` **on purpose**, consistent with how `Port` (a)/(b) were treated, because ticking one of the three while
the row's door is still bypassed would be exactly the "one caller out of three" trap. **ONE NUMBER unchanged
75 / 321 = 23%.**

**★ NEXT (as of R28-4) was `CC-67`** — move the two remaining direct callers (`api/ai/chat/route.ts:688` `runAiAgentText`;
`api/ai/run-object/route.ts:186` + `lib/business-ir-author.ts:160` `runAiAgentObject`) onto the door. **`CC-67` is now ✅ DONE (§7.5).**
**★ NEXT now = sub-row R28-5** — the "nothing bypasses the door" check (§8 below), the **exit gate** for `B-05`/`N-8`.

---

### §7.5 `CC-67` — the platform runtime sits behind the door; the last two callers walk through it — BUILT (2026-10-11, code repo `6c3db27c`)

**What landed.** A **second** implementation of `AiRuntimePort` —
`packages/ai-assistant/src/modules/ai_assistant/lib/agent-runtime-port-adapter.ts` — puts the platform's
**own in-process AI SDK runtime** (`runAiAgentText` / `runAiAgentObject`) behind the same door the OpenCode
engine sits behind. Then the three callers that reached that engine by name were moved onto the door:

- `api/ai/chat/route.ts` (was `runAiAgentText`) — builds the adapter per request, `startRun` →
  `attachRunInput` → `streamRun`, reads the engine's `Response` back with `responseForRun`, hands it to the
  client;
- `api/ai/run-object/route.ts` and `lib/business-ir-author.ts` (was `runAiAgentObject`) — build the adapter
  and call `runObjectForRun`. **None of the three imports `agent-runtime` any more** (proven by a static
  test); only `src/index.ts` still re-exports it — that is the package's public barrel, not a caller.

**Why a SECOND adapter, not the OpenCode one (the decisive measurement).** These callers use a **different
engine**: the platform's own in-process loop, not OpenCode-over-HTTP. A port exists so two implementations
share one interface — that is the whole point. Their input additionally carries **three things the §4.2
envelope must not hold** — the live DI `container`, the full authorization context
(`features`/`isSuperAdmin`/`onBehalfOfUserId`/`boundScope`), and a `UIMessage[]` — so those ride on the
adapter's **construction** (per request), exactly as the OpenCode adapter's `{ auth, em }` do. **The envelope
is not extended; no live object enters it.**

**The honest split (measured against the CLIENT, not assumed).** `runAiAgentObject` returns a **value** →
`runObjectForRun` (the port has no "return an object" op; inventing a ninth would be a design decision, not a
wiring move). `runAiAgentText` returns a **streaming `Response`** whose bytes are the AI SDK's UI-message SSE
— consumed by the client with `DefaultChatTransport` (`agent-transport.ts:47`) and by the route's own
`persistAssistantOnStreamCompletion`. **A `Response` body is single-use**, so the adapter does **not** drain
it: `streamRun` performs the engine call, **stashes** the original `Response`, and the caller hands that exact
object to the client. Re-framing those bytes into port events and writing *those* out would change what a
user sees.

**The hostile critic found a REAL defect — the run was never closed.** My first cut called `startRun` and
**never `completeRun`**, leaving every chat run **open** at the door; a later `cancelRun` would then falsely
report a **finished** run as `cancelled`. (Command evidence: `run.completed after route sequence: false`;
`cancelRun on finished-uncompled run: {cancelled: true}`.) **Fixed, and the fix is proven:**
- the route closes the run in the stream wrapper's `finally`, **before** `writer.close()` — so there is no
  race with the client observing the stream end (the re-verification critic probed exactly this: a slow
  close still lands before the client's `done`);
- the engine-failure path completes `failed` and re-throws; a **bodyless** `Response` still closes
  (the second critic's latent finding — rule 15, closed now rather than left);
- **4 tests** pin the close (normal end, no-persisted-turn, engine failure, bodyless), and a mutation that
  removes the close goes **RED**.

**The binding gate (`CC-27`/`CC-57`) kept honest.** The gate moved **one hop above** the dispatch: the
adapter has no `em`/`auth` and must **not** decide, so the gate lives at the door's callers. All three
callers still `resolveAgentBinding` and refuse `agent_not_bound` (the critic hunted for an un-gated path and
**found none**). `binding-coverage.test.ts` was updated **honestly**: the two adapters are now recognised as
*the door* (not business callers), and a **new pin** asserts every door caller keeps the gate + that no
adapter grows a competing gate. The old positive arm — which asserted `business-ir-author.ts` was a *gated
dispatcher* — became vacuous when its dispatch moved behind the door, so it was replaced by the door-aware
pin, not weakened.

**Proof.** `lib/__tests__/agent-runtime-port-adapter.test.ts` (**15 tests**, the mock boundary is the
**engine**, below the adapter) + **4** new close-guard tests in `api/ai/chat/__tests__/route.test.ts` +
**2** new binding pins. The pre-existing `api/ai/chat/__tests__/route.test.ts` (27 tests) and the
object/business-ir suites pass — and crucially, the 27 route tests **mock the engine and assert it is called
with the resolved payload**, so they pass **only because the adapter is the path** (a stronger proof than a
static check). Route + adapter type-check clean. **Whole package suite green: 117 suites / 1596 tests**
(`CC-67` baseline 116 / 1575). **8 RED-then-GREEN mutations** (M1 cancel reports a reason; M2 complete loses
replay safety; M3 cancel order-dependence; M4 `streamRun` drains the body; M5 the route re-imports the
engine; M6 the caller drops `agent_not_bound`; M7 an adapter grows a competing gate; M8 the route leaves the
run open), each restore **md5-verified**. **Two separate-agent hostile critics**: the first found the
run-close defect (fixed); the second verified the fix on all five claims and found only a latent
bodyless-`Response` gap (also fixed).

**No box moved — the honest outcome.** This is the change the whole row points at: after it, **no production
code outside the two adapters names an engine**. But the row's sentence is *"**no other** code talks to it
directly"*, and **one registered bypass remains** (`CC-69`: the chat route's `answerQuestion` short-circuit
still calls `createOpenCodeClient` — it is not a *run*, so it is a port-shape decision, not a wiring move).
`B-05`, `N-8` and the three `Port` boxes keep their `☐` **on purpose** — R28-5 exists to *prove* the door is
the only way in, and that proof is the row's exit gate, not this move. **ONE NUMBER unchanged 75 / 321 = 23%**
(re-derived, §L 21st run).

**★ NEXT = sub-row R28-5** — the "nothing bypasses the door" check: prove, mechanically, that no production
file outside the two adapters reaches an engine, with `CC-69` named as the ONE registered exception (and
`src/index.ts` named as the package barrel, not a caller). Then **R28-6** (`N-8`'s second half — delete
OpenCode). — **Both now resolved:** `R28-5` ✅ **DONE 2026-10-12** (§7.6); **`R28-6` MEASURED 2026-10-12
and found TRIGGER-BLOCKED** (§8 — Hermes does not exist; deleting OpenCode would remove the only engine).

---

### §7.6 R28-5 — the door is the only way in (the row's exit gate) — **BUILT, and the box question answered honestly** (2026-10-12, code repo)

**What was built.** ONE new test file,
`src/modules/ai_assistant/__tests__/door-only-way-in.test.ts` — a sibling of `binding-coverage.test.ts` (that
suite proves the *gate*: "is every dispatch gated?"; this one proves the *door*: "does anything reach an
engine without it?"). It walks every production `.ts`/`.tsx` file under `src/`, comment-strips each, extracts
every module edge that resolves to an engine basename, and asserts the **only** engine-reaching files are the
two engine definitions, the two adapters, the barrel, and the **two named exceptions**.

**The measured inventory (rule 0b) — 9 files reach an engine, all accounted for.** 3 engine definitions
(`agent-runtime.ts`, `opencode-client.ts`, `opencode-handlers.ts`), 2 adapters (the door), the barrel
`src/index.ts` (re-exports), `api/chat/route.ts` (→ **`CC-69`**), `api/health/route.ts` (→ **`CC-71`**, a
*new* finding), and `lib/ai-runtime-port.ts` (comment-only mentions — no import). **Two premise corrections
(rule 13):** the plan's first draft named `api/ai/chat/route.ts` for `CC-69` — the reach is in
**`api/chat/route.ts`**; and `api/ai/chat/route.ts` (the `CC-67` route) imports **no** engine at all.

**The test (11 assertions).** (1) the declared engine set exists; (2) each declared engine file really
**defines** an engine entry point; (3) **the derivation test** — scans `lib/` for engine-defining files and
requires the declaration to name them all; (4) the door/engine files are not mistaken for callers; (5) the
**scan** — only the door, engines, barrel and named exceptions import an engine; (6) each exception imports
**only** the engine it is allowed; (7) no third engine is imported anywhere; (8) `CC-69`/`CC-71` pinned to
their exact call sites; (9) `api/ai/chat/route.ts` is **not** an exception (fully behind the door); (10) the
barrel's engine reaches are `export … from` (a surface, not a caller); (11) **the scan really visits `.tsx`**
(the self-check that closes the critic's `.tsx` hole).

**Proof.** Isolated: **11/11 green**. Full package suite: **118 suites / 1607 tests green** (baseline
117/1596 → **+1 suite, +11 tests**). Type-check: a whole-package `tsc --noEmit` shows **100 pre-existing
errors with the file and 100 without** (a control), **0 attributable to this change**. **Mutation proof: 12
mutations, ALL RED, every one md5-restored** — 8 test-side (T1 an unpinned exception hides a second engine;
T2 remove a named exception; T3 pin assertion vacuous + a real second import; T4 a commented-out import
un-stripped; T5 single-line-only detection; T6a the `.tsx` filter reverted *without* an importer — caught by
the self-check; T6b `.tsx` filter reverted *with* a `.tsx` importer; T7 a new engine-defining file with the
derivation intact) + 4 production-side (P1 a new `.tsx` imports an engine; P2 a new engine-defining file in
`lib/`; P3 the health exception grows a second engine import; P4 `api/ai/chat` starts importing an engine).

**A separate-agent hostile critic was run — it found THREE real defects, all fixed.** (a) `walk` filtered
`.ts` only → **36 `.tsx` files were invisible** (the most serious: the suite's central claim was unproven for
React components); (b) only single-line `import … from` was detected — multi-line imports, side-effect
imports, `require()` and dynamic `import()` were all missed; (c) the header claimed the engine set was
**"derived, not typed"** when it was a hard-coded array. (a)/(b)/(c) are all repaired, and — critically — the
`.tsx` fix is now **self-guarding** (defect (a) could be silently reverted and the suite stayed green until
the self-check test was added; T6a now proves the self-check catches exactly that).

**The honest box question — answered (rule 9b).** The row's sentence is *"**no other** code talks to it
directly"*. After this change **no production code outside the two adapters reaches an engine for a run** —
that is now *mechanically proved*, not asserted. But the sentence is **not literal**: **two registered,
non-run reaches remain** — `CC-69` (the chat route's `answerQuestion` short-circuit) and `CC-71` (the health
endpoint). Both are pinned by the suite, both are registered with a callback, and neither is a *run*. The
honest reading: **`B-05` ticks** (the port is the one typed door, and nothing reaches an engine around it for
a run); **`N-8` ticks on its "rewire" half** (everything is rewired through the door) **and stays open on its
"delete" half** (OpenCode still exists — `R28-6`). The two non-run exceptions do **not** block either, because
they are recorded with callbacks, not silently tolerated.

**★ NEXT.** `CC-69` and `CC-71` were **RULED 2026-10-12** (owner delegated: *"do what you find best for
the platform long-term"*): **both are ACCEPTED as deliberate, named, permanent exceptions** — `CC-69` is a
*control message about a paused run* (not a run), `CC-71` is a *monitoring surface* (not a run). **The door's
contract is NOT widened now**, because the engine behind it (OpenCode) is a placeholder that `R28-6` deletes:
shaping the contract around it today would be designing the door around an engine we are discarding. **The
contract's shape is decided when Hermes lands** (the real engine). So the row's two reaches are **closed as
decisions**. **What remains is `R28-6`** (delete OpenCode) — and it was **MEASURED 2026-10-12 and found
TRIGGER-BLOCKED** (§8 below): no Hermes **engine** is wired (the Hermes **source** is in the docs repo as two
gitignored extracts — corrected, rule 13 — but nothing behind the door), so deleting OpenCode would remove the
**only** engine that answers a chat (registered as **`CC-72`**). **It is therefore NOT a buildable task** —
the honest next work is the **Hermes track** (architecture §9 Phase 0→2), not a deletion. **AND THE HERMES TRACK
STARTED 2026-10-12: arch §9 `Phase 0` ("pin & map") is DONE** — see **`HERMES-PIN.md`** (the pin: recorded source
revision + whole-snapshot digest + the harness `library/.hermes_pin.py --check`; the licence position including
optional components; the exact symbols mapped). **The next Hermes frontier is §9 Phase 2** (one worker, one tenant,
one tool) — Phase 1 (the port with OpenCode behind it) is our achieved state. **ONE NUMBER**, re-derived honestly
in §L's 23rd run: `B-05` ✅ (1.0) + the two `Phase 0` boxes ✅ (2.0) — **78 / 321 = 24%** (`N-8` stays open:
delete half trigger-blocked).

---

## §8. Measured vs quoted (so nothing is overstated)

> **Rule-13 correction (2026-10-12):** three places in this plan's R28-5/R28-6 narrative say *"Hermes does
> not exist"*. Measured against the **docs** repo, that is **under-scoped and false as written** — the Hermes
> **source** lives there as two gitignored extracts (`library/ai/hermes-agent-main/`, the pinned copy =
> the snapshot zip's contents, 17,201 files; and the root `hermes-agent-main/`, a later 17,367-file extract).
> What is genuinely absent is a Hermes **engine behind the door**. The §8 verdict and `CC-72`'s trigger are
> **unchanged**; only the wording is corrected, here and in the row's §5/§8 text above. See **`HERMES-PIN.md`**.

- **Measured in code (this session):** §1 rows 1–6, all by reading the named files; the R28-1 proof
  (tests, `tsc`, mutations, the full-suite run).
- **Quoted from the architecture document (now implemented faithfully):** the eight operation signatures,
  the §4.2 envelope field list, the envelope's three rules, the "rewire first, delete second" order, and
  §9 Phase 1's exit gate — all re-read verbatim from `ARCHITECTURE-hermes-integration.md` §4/§7/§9.
- **Now measured:** how many tests assert the chat route's OpenCode import (R28-3): the pre-existing
  `chat-route-ownership.test.ts` (8 tests, mocks the engine below the door) plus the new
  `chat-route-through-port.test.ts` (15 tests). The route's remaining direct engine import is **one**
  symbol (`createOpenCodeClient`), in the registered `CC-69` bypass.

**R28-2 measurement (2026-10-11).** The whole `ai-assistant` package suite was run green: **114 suites /
1552 tests** (the R28-1 baseline was 112 / 1527 — so R28-2 added 2 suites and 25 tests, exactly the adapter
suite plus its tests). The scoreboard was re-derived (rule 0, not typed): **75 / 321 = 23%**, per-section
A 11/31 · B 7/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 —
**unchanged**, because `B-05` / `N-8` are about the door being *used*.
