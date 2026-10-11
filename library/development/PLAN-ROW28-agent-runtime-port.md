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
| `Port` (c) | Failure is normal: `cancelRun` is bounded and safe to repeat; `completeRun` is safe to replay | ☐ |
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
**Status: BLOCKED on R28-1 (can be built with R28-2).**

**What it is.** Make the door behave correctly when things go wrong: asking to cancel twice must be
harmless, and re-sending a "run finished" message must not double-count. This is what the spec calls
*"failure is normal, not exceptional."*

**Prerequisite.** R28-1 (the door's shape). Can proceed alongside R28-2.

**Takes points:** `Port` (c).

---

### R28-5 — Prove the door is the only way in (nothing else talks to an engine directly)
**Status: BLOCKED on R28-3.**

**What it is.** A check that fails the build if any code besides the door reaches an AI engine directly.
Without it, the door is a suggestion, and the next session can quietly bypass it.

**Prerequisite.** R28-3 (the chat route must be on the door first, or the check would fail immediately).

**Takes points:** the row's own guarantee (*"no other code talks to it directly"*).

---

### R28-6 — Delete OpenCode
**Status: NOT IN ROW 28 — a separate, later step. Tracked as `N-8`'s second half.**

**What it is.** Remove OpenCode (its client, its handlers, its `OPENCODE_URL`) once the chat route is
proven on the door.

**Why it is separate.** The architecture document is explicit: the deletion *"is only safe once the chat
route is proven on the port"*, and it is *"a separate, later, testable step."* Folding it into row 28
would be a big-bang change — exactly what §7.2 forbids.

**Prerequisite.** R28-3 (proven) and — for Hermes itself — the security gates in §8 of the architecture
document, which are **not** this row's work.

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
| The two other AI paths (`runAiText`, `runAiObject`) | None in row 28 | Explicitly out of scope (`§4`); registered as `CC-67` |
| Any test that asserts the chat route imports OpenCode by name | Medium — the import moves | Find and update them in the same change (rule 10e) |
| `ce.ts`'s comment-only `AiRuntimePort` | Low — a false "it exists" statement | Correct it in the same change (rule 13) |

---

## §6. Registration (rule 8)

Every sub-row that ends less than fully done gets (or keeps) a row in `COMPLETION-CALLBACKS.md`:

- **`CC-67`** (new, this plan) — **the two other AI paths still call an engine directly.** Rows 2 and 3
  of §1 (`api/ai/chat/route.ts:688`, `api/ai/run-object/route.ts:186`) are not moved by row 28.
  **Trigger:** when R28-3 has proven the door on the chat route.
- **`CC-66`** (existing, row 27) — unchanged; not this row.
- **`CC-69`** (new, R28-3) — **the chat route's `answerQuestion` short-circuit still calls OpenCode
  directly.** It is not a run (the port has no such operation); registered rather than hidden.
  **Trigger:** when the port's contract is next extended, or when Hermes lands.
- **`CC-70`** (new, R28-3) — **the run's `capabilityGrantId` is carried but not consumed.** The OpenCode
  adapter does not read it (it resolves tools internally and reports `resolveToolCall` ✗). **Trigger:** the
  first engine that implements `resolveToolCall` (Hermes, §9 Phase 2+).
- **`N-8`'s second half** (delete OpenCode) — stays open, with the trigger named in §3 R28-6.

---

## §7. OUTCOME

*(Filled with measured evidence per sub-row, per rule §2.1: every claim carries an observation, and the
"done" is a measured claim, not a tag.)*

| Sub-row | Status | Evidence |
|---|---|---|
| R28-1 | ✅ **DONE 2026-10-11** | See §7.1 below. |
| R28-2 | ✅ **DONE 2026-10-11** | See §7.2 below. |
| R28-3 | ✅ **DONE 2026-10-11** | See §7.3 below. |
| R28-3 | not started | — |
| R28-4 | not started | — |
| R28-5 | not started | — |
| R28-6 | out of row (N-8) | — |

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

## §8. Measured vs quoted (so nothing is overstated)

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
