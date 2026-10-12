# PLAN — Hermes §9 **Phase 2: one tenant, one tool**

**Status: WRITTEN FIRST, per the working protocol** — *"Requirement = task definition + those points,
written BEFORE any code."* No Phase 2 code exists yet. This document is the requirement; the builds
below are executed against it, one sub-row at a time, under the full protocol (hostile critic,
RED-then-GREEN, two-route).

**Read it with:** [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) §9 (the
adoption order — this document is its **Phase 2** row), [`HERMES-PIN.md`](HERMES-PIN.md) (the pinned
source this plan drives), [`PLAN-ROW28-agent-runtime-port.md`](PLAN-ROW28-agent-runtime-port.md)
(the door the engine lands behind).

---

## 1. What Phase 2 is — the architecture's own words

> **2. One tenant, one tool** | *A single Hermes worker, one provider, one narrow tool, through the
> existing authenticated context.* | Exit gate: *"Cancellation, retry idempotency, usage capture,
> bounded memory and CPU, and **no cross-scope access**, all proven on one tenant then on two
> adversarial ones."*

Phase 0 (pin & map) and Phase 1 (the port, with OpenCode behind it) are **done** — Phase 1 is the
platform's achieved state: `lib/ai-runtime-port.ts` exists, every production caller walks through it,
and `R28-5` mechanically proved the door is the only way in. **Phase 2 is the first phase that puts
Hermes itself behind that door.**

Three things in the row's own wording decide the shape:

- **"one tenant"** and **"no cross-scope access"** — scope is *derived from auth*, never chosen by the
  runtime (§10, risk 1). The run's tenant/principal come from the admitted envelope, which the
  platform already mints server-side (R28-3).
- **"one narrow tool"** — the runtime gets **one** tool, and every call re-authorizes at execution
  time through `resolveToolCall(call, capabilityGrant)`, *"the ONLY path to a business operation"*
  (§4.1). Not a tool catalogue: one.
- **"bounded memory and CPU"** — this is a *worker* statement, not a request statement: a supervised
  private process with a budget, a deadline and a hard stop (§10, "noisy neighbours").

---

## 2. Rule 9b — challenge the task BEFORE building it

**2.1 The foundation question (rule 10d — never stack on an unfinished foundation).** What must exist
before anything else? **A worker that can be started, spoken to, and stopped.** An adapter written
against a runtime that has never booted is guesswork wearing a type signature. So the order below is
fixed: *boot → speak → adapt → select → prove*.

**2.2 What cannot be proven in this environment — stated up front, not hidden.** Measured 2026-10-12
at the time of writing: `docker --version` → **29.8.1** (installed), but `docker info` → **the daemon is
not running** (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`).
Therefore the worker's **boot** gate could not be discharged here. The Docker scaffolding in sub-row 1
was written and reviewed, and its boot gate was recorded as **UNPROVEN-HERE** with the exact command
that discharges it. Nothing in this plan claims a boot that did not happen.

> **CORRECTED 2026-10-12 (rule 13 — the premise changed under us, by the owner's own hand).** The
> owner started Docker: *"docker is on now. Make sure I do not interrupt your flow of thoughts, but
> this is there to help you if needed."* Measured now: `docker info --format '{{.ServerVersion}}'` →
> **29.8.2**. So **`P2-1`'s boot gate IS dischargeable in this environment** — the daemon being down is
> no longer a reason to defer it, and `P2-1` becomes the next sub-row rather than a recorded
> UNPROVEN-HERE. The measurement above is kept verbatim as the record of the moment it was written.

**2.3 What CAN be proven here, and therefore what is built first.** The JSON-RPC surface Hermes
exposes is **typed and measured from the pinned source** (§3.1), including the stdio **framing**
(newline-delimited JSON frames — §3.2). A *client* for that surface is ordinary TypeScript, testable
against a protocol stub that implements the measured handshake. So sub-row 2 is built and proven
here; sub-row 1's boot is proven on a machine with a running daemon.

**2.4 The added value the re-pin made visible.** The **re-pinned** copy (revision `3569e846…`,
18,248 files) exposes **`session.steer`** and **`subagent.steer`** (§3.1). `steerRun` is the port
operation **both** engines behind the door today report ✗ (`describeCapabilities().operations`).
Hermes is therefore the first candidate that could make the port's eight real rather than seven —
recorded here as a measured fact for sub-row 3, not as a claim until the adapter proves it.

**2.5 The "one narrow tool" must come from the vision's spine, not a business module.** The owner's
ruling 2026-10-12: *business modules should be generated from the core workspace (prompt → AI →
business IR → save functions → categorize as modules); we should not develop business module
functionality unless needed for testing.* The platform already has that spine — the **Business-IR
chain** (`lib/business-ir-author.ts`, `lib/business-ir-run.ts`, `ai-tools/business-ir-pack.ts`).
That is the one narrow tool Phase 2 delivers to the worker. **No business module is built to test
it.**

---

## 3. Measured facts (rule 0b — measured in the pinned source and the code repo, 2026-10-12)

### 3.1 The run-path protocol surface — re-verified against the RE-PINNED copy

The pin's §3 named the three protocols; Phase 2 needs the exact wire surface, so it was measured again
post-re-pin. The contracts registry (`tui_gateway/contracts/`, 22 files, **8,387 lines**) declares
**258 typed methods** and their payloads. The run-path subset:

| Concern | Measured methods (pinned `hermes-agent-main/`) |
|---|---|
| **Handshake / liveness** | `ping` → `pong` · `gateway.capabilities` → `per_session_exclusive_submit` · `client.capabilities` (`{server_requests}`) → the server→client request list · event `gateway.ready` |
| **Start a turn** | `prompt.submit` (`text`, `surface`, `queued`, `interrupt`, truncation consent…) → `status: streaming\|queued\|steered\|redirected` |
| **Sessions** | `session.create` · `session.list` · `session.activate` · `session.status` · `session.history` · `session.resume` · `session.close` · `session.interrupt` · `session.steer` · `session.branch` · `session.compress` · `session.usage` · `session.delete` |
| **Stream events** | `gateway.ready` · `message.start` · `message.delta` · `message.interim` · `message.complete` · `tool.*` · `approval.*` · `error` |
| **Process control** | `process.list` · `process.stop` · `process.kill` |
| **Tools** | `tools.list` · `tools.show` · `tools.configure` · `command.dispatch` · `command.resolve` |
| **Reload** | `reload.env` · `reload.mcp` |
| **Subagents** | `subagent.list` · `subagent.tail` · `subagent.steer` · `subagent.interrupt` |

Method/event names are read from the registry's own `method(...)`/`event(...)` declarations, not from
a report about them. Unknown-method handling is explicit: `-32601` with *"the client and the Hermes
backend are out of sync (different versions)"* (`rpc_dispatch.py`) — which is exactly the error a
version-compatibility harness must classify, and is **not** the pin harness (`HERMES-PIN.md` §2.1).

### 3.2 The stdio framing — measured, not assumed

`tui_gateway/transport.py::StdioTransport.write` → `serialize_frame(obj, "stdio") + "\n"`, then
`flush()`. **One JSON object per line, newline-delimited, flushed per frame.** That is the whole
framing rule the client must honour on both directions.

### 3.3 The platform's seam — where the engine is chosen

`packages/ai-assistant/.../api/chat/route.ts::resolveAiRuntimePort` (`:118`–`:126`) is the **one**
place the engine is chosen, and it already says so in its own docstring: *"today it is OpenCode
behind the port; a future engine swaps here and nowhere else."* Sub-row 5 changes only that function.

### 3.4 The supervision pattern to copy

OpenCode is a **Docker service** (`docker/opencode/Dockerfile` + `entrypoint.sh`), named
`mercato-opencode-${DEPLOY_ENV}`, `restart: unless-stopped`, with the platform pointing at it via
`OPENCODE_URL` (default `http://opencode:4096`) and provider/model chosen by `OM_AI_*` /
`OPENCODE_*` env. Hermes takes the same shape: one supervised service, health-gated, config from our
env — *never* a second product surface (§11: "one interface (ours)").

### 3.5 The narrow tool — the vision's spine, already built

`lib/business-ir-author.ts` + `lib/business-ir-run.ts` + `ai-tools/business-ir-pack.ts`, with tests
(`business-ir-author.test.ts`, `business-ir-run.test.ts`, `business-ir-pack.test.ts`). This is the
"prompt → business IR" path the owner named as the product's main logic. Phase 2 delivers **this**
tool to the worker, authorized at execution time under the existing `S-02` gate
(`S-02` — tool-call authorization at execution time, deny-by-default, DONE `3add3a2`).

---

## 4. The sub-rows — each with its own exit gate

A phase is not done because code exists; it is done when the gate is measured. The order is the
foundation order from §2.1.

| Sub-row | What lands | Exit gate |
|---|---|---|
| **P2-1** | **The worker boots.** `docker/hermes/` (image + entrypoint) and a compose service, mirroring `docker/opencode/`: pinned source vendored, `uv`-locked deps, the TUI gateway started on stdio, health from `ping`, config from `OM_AI_*` | A real process answers the measured handshake (`ping` → `pong`, `gateway.capabilities`, `client.capabilities`, `gateway.ready`) **and stops on `process.stop`**. **NOW DISCHARGEABLE HERE — the daemon is up** (`docker info` → **29.8.2**, measured 2026-10-12; see the corrected §2.2). *Previously recorded UNPROVEN-HERE because the daemon was down; that premise is corrected, not carried.* |
| **P2-2** | **The gateway client.** `lib/hermes-gateway-client.ts`: spawn/supervise the worker, newline-JSON framing both ways, typed request/response correlation, the handshake, `prompt.submit` + the event stream, `session.interrupt`/`steer`, `process.stop` | ✅ **DISCHARGED 2026-10-12** (commit `f5f85064`). Against a **protocol stub implementing the measured contract** (§3.1/§3.2), all four behaviours proven: handshake (with the snake_case wire keys), one streamed turn as ordered typed events, cancel, and **a malformed frame does not kill the stream**. **21/21 tests.** Hostile-critic-hardened: a separate agent found 3 real defects (every event is an `event`-enveloped frame, so nothing dispatched; a pino-style logger call on a message-first logger; an unguarded `stdin.write`), each verified against the pinned source and fixed — and the critic's finding invalidated part of the suite, whose frames were the *un-enveloped* shape the real server never writes. **RED-then-GREEN:** mutating the envelope unwrapping turns **8 of 21 RED**; restored md5-identical (`4416a886…`) → 21 GREEN. **`tsc` clean — honestly qualified:** `P2-2`'s own two files are error-free, but the package's type gate **did not exist** (`tsc -p .` = TS18003; it was the only one of 21 configs not extending `tsconfig.base.json`). Fixing that surfaced **92 pre-existing errors in 27 other `__tests__` files**, scheduled as **`CC-73`** with the native-compiler and stale-`tsbuildinfo` measurements recorded as **L138/L139**. Any `tsc` run on this package must pass `--incremental false` to be reproducible. |
| **P2-3** | **The port adapter.** `lib/hermes-port-adapter.ts` implementing `AiRuntimePort`, with an **honest** capability map — measured against the client, ✗ where it is ✗ (no pretending; the OpenCode adapter's own standard) | `describeCapabilities()` reports the truth for all eight ops; the eight operations' contracts (idempotent `cancelRun`, replay-safe `completeRun`, usage with its scope stated) hold. The **`session.steer`** claim of §2.4 is settled by measurement, one way or the other |
| **P2-4** | **The one narrow tool.** The Business-IR tool delivered to the worker, every call re-authorized at execution time through `resolveToolCall(call, capabilityGrant)` | A tool call **without** a grant is refused; a call **with** one is authorized per `S-02`; the runtime never widens the grant |
| **P2-5** | **Selection at the door.** `resolveAiRuntimePort` becomes config-selected; OpenCode stays the default; the chosen implementation is recorded on the run | Swapping engines touches exactly one function; **`door-only-way-in.test.ts` still passes** (the door is still the only way in); OpenCode is untouched and still answers |
| **P2-6** | **The exit gate proof** — cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access, on one tenant then on two adversarial ones | All five, measured, on one tenant; then the two adversarial tenants: a run admitted for tenant A cannot read, name or affect tenant B — proven by a negative test that fails if any cross-scope frame exists |

---

## 5. What Phase 2 moves on the scoreboard — and what it does not

Phase 2 is a **build with a proof gate**, not a box. Honest expectation, stated before the build so it
cannot be re-worded afterwards:

- **`Port` (the three boxes in §D)** stay `☐`: `steerRun` becomes supportable only if P2-3 proves
  `session.steer` really maps, and `resolveToolCall` only if P2-4 lands — and a box is never ticked
  while its siblings are open (the "one caller out of three" rule).
- **`Runtime state`** ("isolated per tenant and agent; export, backup, delete, retention") — P2-6
  proves *isolation*, but export/backup/delete/retention are Phase 4's. Stays `☐`.
- **`Sandbox`** ("disposable, quota-bounded, network-policed") — P2-6 proves *quota-bounded*; the
  network policy and disposable-sandbox threat model are Phase 6's. Stays `☐`.
- **Most likely outcome: no box moves.** Phase 2 buys the thing every later phase needs — a Hermes
  worker measurably behind the door — and it is what unblocks `R28-6` / `CC-72` (delete OpenCode).
  If that is the outcome, **it is reported as such**; a box is not ticked to make the number move.

---

## 6. Risks — from the architecture's own §10 table, with the control each

| Risk | Control (where this plan honours it) |
|---|---|
| Cross-tenant leakage through session, profile, file, skill or log | Scope **derived from auth**, never from the runtime; the worker gets the envelope's `tenantId` and nothing else; the adversarial negative test in P2-6 |
| A tool bypassing policy | One door; authorize at execution time; **no DB credential in the runtime** (P2-4) |
| A model-widened grant | The grant may be narrowed by the runtime, never widened — asserted in P2-3/P2-4 |
| Duplicate authority (two model configs, two transcripts, two schedulers) | One engine selected in one place (P2-5); every runtime cache is disposable derived state |
| Unpinned runtime drift | The pin + its harness already gate this; `-32601` on a protocol mismatch is classified, not guessed (§3.1) |
| Noisy neighbours / unbounded work | P2-1's budget + deadline + `process.stop`, proven in P2-6 |
| A false performance premise | **Phase 3** owes the first number; Phase 2 claims none |

---

## 7. Rule 10e — the update sweep this plan triggers

Per change, in the same commit as the build it describes: `COMPLETION-CALLBACKS.md` (a `CC-` row for
any partial), `BACKLOG.md` (`▶ FRONTIER`), `platform_points.md` (boxes + `§L` re-run), `JOURNAL.md`
(★ ACTIVE TASK + a done block), `LESSONS.md` (rule 7), `HERMES-PIN.md` (if the pin moves), memory.

---

## 8. How this document was verified (rule 0)

Every claim above is from a command and its output on 2026-10-12, against the **re-pinned** snapshot
(`hermes-agent-main/`, revision `3569e846…`, digest `ca760e97…`) and the code repo at `b8f53cb0`:
`ls`/`wc -l`/`grep` over `tui_gateway/contracts/*.py` (258 methods, 8,387 contract lines, the
run-path subset listed in §3.1); `transport.py::StdioTransport.write` for the framing; the
registry's own `method()`/`event()` declarations; `api/chat/route.ts::resolveAiRuntimePort`;
`docker-compose.fullapp.dev.yml`'s opencode service; `docker info` for the daemon state.
**No claim here comes from a report about the source.**
