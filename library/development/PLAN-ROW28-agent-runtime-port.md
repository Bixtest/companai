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
**Status: BLOCKED on R28-1 (needs the door's shape to fit behind).**

**What it is.** Wrap the **existing** OpenCode client so it fits behind the new door. OpenCode does not
change and is not removed — it simply becomes one of the things the door can hide. Nothing new is added
to the system; the existing engine just learns to sit behind the door.

**Prerequisite.** R28-1 (the door's shape).

**Takes points:** `N-8` (first half), `B-05`.

---

### R28-3 — Move the chat screen onto the door
**Status: BLOCKED on R28-1 + R28-2.**

**What it is.** Change the chat route so it reaches the AI engine **through the door** instead of
importing OpenCode by name. This is the step that makes row 28's own sentence start becoming true.

**Prerequisite.** R28-1 and R28-2.

**Why it matters.** Until this step, the door exists but nobody walks through it — which is exactly the
"capability nobody can reach" trap our rules warn against. This step closes it.

**Takes points:** `N-8` (the move), `Port` (a) completes.

**Exit gate (the architecture document's own words):** the chat works through the door; OpenCode is one
implementation behind it; the test suite is green.

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
- **`N-8`'s second half** (delete OpenCode) — stays open, with the trigger named in §3 R28-6.

---

## §7. OUTCOME

*(Empty until built. Filled with measured evidence per sub-row, per rule §2.1: every claim carries an
observation, and the "done" is a measured claim, not a tag.)*

| Sub-row | Status | Evidence |
|---|---|---|
| R28-1 | not started | — |
| R28-2 | not started | — |
| R28-3 | not started | — |
| R28-4 | not started | — |
| R28-5 | not started | — |
| R28-6 | out of row (N-8) | — |

---

## §8. Measured vs quoted (so nothing is overstated)

- **Measured in code (this session):** §1 rows 1–6, all by reading the named files.
- **Quoted from the architecture document (not re-measured):** the eight operation names, the envelope
  rules, the "rewire first, delete second" order, and §9 Phase 1's exit gate.
- **Not yet measured:** how many tests assert the chat route's OpenCode import (to be found in R28-3).
