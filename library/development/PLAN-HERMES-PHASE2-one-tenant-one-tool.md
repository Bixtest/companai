# PLAN — Hermes §9 **Phase 2: one tenant, one tool**

**Status: WRITTEN FIRST, per the working protocol** — *"Requirement = task definition + those points,
written BEFORE any code."* No Phase 2 code exists yet. This document is the requirement; the builds
below are executed against it, one sub-row at a time, under the full protocol (hostile critic,
RED-then-GREEN, two-route).

**Progress: `P2-1` ✅ (2026-10-12, §2.7) · `P2-2` ✅ (2026-10-12, §4) · `P2-3` ✅ (2026-10-12, §2.9) — NEXT = `P2-4`, the one narrow tool
(`session.steer` settled by measurement before anything is claimed for it).**

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

## 2.6 `P2-1` — the requirement, measured before any Dockerfile was written (2026-10-12)

**Why this section exists (rule 3).** `P2-1` is the first sub-row, and it is the one whose premise changed
twice (the daemon was down, then the owner started it). What follows is everything measured in the pinned
source and in this repo *before* the image was built, so the build cannot quietly encode a guess.

**The runtime, measured in the pinned source:**
| Fact | Measurement |
|---|---|
| Python | `pyproject.toml` `requires-python = ">=3.11,<3.15"`, and `[tool.uv] environments = ["python_version >= '3.14'"]` — the lock covers **3.14 only**. → base image `python:3.14-slim-bookworm` (pulled, `sha256:48b13b00…`). |
| Deps | **46** direct pins, all exact (the supply-chain discipline the file documents in its own comments). `uv.lock` exists (**1.2 MB**, revision 3) → install with `uv sync --frozen --no-install-project`. |
| Entry point | `tui_gateway/entry.py` ends in `main()` under `if __name__ == "__main__"` → `python -m tui_gateway.entry`. |
| State root | `hermes_constants.get_default_hermes_root()` honours **`HERMES_HOME`** → set it to a writable path (`/var/lib/hermes`); nothing in the source tree is written at runtime. |
| Boot needs no model | `main()` reaches the `gateway.ready` write with only best-effort steps before it (truststore, heartbeat refresher, orphan sweep, **backgrounded** MCP discovery — *"so a dead MCP server can't freeze startup"*). So the handshake gate needs **no API key and no model**. |
| Source is 18,248 files | Vendoring it into the code repo would create a **second** copy — the defect **L136** names. |

**The three decisions that follow (each measured, each recorded):**
1. **The pin is mounted read-only, not vendored.** `docker-compose.hermes.yml` bind-mounts
   `${HERMES_PIN_DIR:-../../hermes-agent-main}` at `/hermes-src:ro`. One copy stays one copy. The entrypoint
   then **re-computes the pin digest at boot** (the same algorithm as `library/.hermes_pin.py`: sorted
   `"<md5>  <relpath>"` lines, md5 of the join) and **refuses to start** unless it equals
   `ca760e97ff1ef1f0e2ed3deb0dfc2923` — so the guarantee is a runtime assertion on the code that actually
   runs, not a claim about a build. Skip only via an explicit, loudly-logged `HERMES_SKIP_PIN_VERIFY=1`.
   Bytecode writing is disabled (`PYTHONDONTWRITEBYTECODE=1`) so no `__pycache__` can touch the mounted
   digest or fail on a read-only mount.
2. **The dependency closure is built from the pin, without copying the tree.** The Dockerfile declares a
   **named build context** (`--build-context hermes_pin=<pin dir>`, wired in compose as
   `additional_contexts`) and `COPY --from=hermes_pin pyproject.toml uv.lock` — BuildKit transfers only the
   files the COPY names, so a build costs a few KB of context, not 87 MB, and the lock that builds the image
   is the lock in the pin.
3. **The compose service is a SEPARATE file — the owner's ruling 2026-10-12.** The choice was put to the
   owner as one question with a recommendation (*a separate opt-in `docker-compose.hermes.yml` rather than
   adding Hermes to the shared `docker-compose*.yml` files*), because a half-proven engine should not start
   for every developer by default — the same reasoning that keeps OpenCode load-bearing until its
   replacement is proven. **Ruled: separate file.** It keeps the `OM_AI_*` env contract.
   **Network — corrected after the fact (rule 13), see §2.7.** The first version copied `docker-compose.yml`'s
   hardcoded `name: mercato-network`; the measurement falsified it (my worker was alone on that network while
   the whole `*-local` stack ran on `mercato-network-local`). The file now attaches to
   **`${HERMES_DOCKER_NETWORK:-mercato-network-local}`**, declared **`external: true`** so this file can
   neither create nor remove a network another stack owns.

**What this row does NOT claim.** It does not put Hermes behind the door (`P2-3`), it does not deliver the
narrow tool (`P2-4`), and it does not select the engine for a chat run (`P2-5`). It proves one thing: **the
pinned worker boots as a real process inside the image, speaks the measured handshake on stdio, and stops
on `process.stop`.**

## 2.7 `P2-1` discharged 2026-10-12 — the measured boot, and the network premise the measurement corrected

**The gate (the exit criterion in §4, verbatim):** *a real process answers the measured handshake (`ping` →
`pong`, `gateway.capabilities`, `client.capabilities`, `gateway.ready`) **and stops on `process.stop`***.
Run as `python docker/hermes/handshake_gate.py`, which spawns `docker run -i` of `hermes-gateway:p2-1`
against the read-only pin — no stub, no mock; the process under test is the image:

```
gate: spawning docker run -i --rm -v C:\...\companai\hermes-agent-main:/hermes-src:ro -e HERMES_HOME=/var/lib/hermes hermes-gateway:p2-1
  ok  client.capabilities    -> {'server_requests': ['approval', 'clarify', 'display.install.sudo', 'preview.act',
       'preview.read', 'secret', 'setup_choose', 'sudo', 'terminal.read', 'tour', 'vault.code',
       'vault.save_login', 'vault.unlock_prompt', 'window.read']}      # all 14
  ok  gateway.capabilities   -> {'per_session_exclusive_submit': True}
  ok  ping                   -> {'pong': True}
  ok  gateway.ready          -> ['change_events', 'replay_epoch', 'skin']   # the P2-2 envelope, live
  ok  process.stop           -> answered
GATE PASSED in 39.5s — the pinned worker booted, answered the measured handshake, and stopped on process.stop.
```

Image built in **1m49s** from the pin's own lock (`uv sync --frozen --no-install-project --no-dev --python 3.14`),
**673 MB**. The compose cold start adds the boot digest: `PIN HOLDS — files: 18248, digest:
ca760e97ff1ef1f0e2ed3deb0dfc2923`, then `exec: python3 -m tui_gateway.entry`, then the real
`gateway.ready` frame — so the P2-2 unwrapping is confirmed against the **live worker** too, not only the stub.

**The RED run (rule 10f):** the same gate pointed at `hermes-agent-main-older` was **refused**:
`PIN BROKEN … actual 3e3b81f2ac67a13b76c08f5140d9efe6 files 17367`, exit 1, **0 stdout frames**. That also
**cross-validates the container's verifier against the host harness** (`library/.hermes_pin.py`): both trees
produce identical digests in both implementations, one written in Python on Windows and one in Python inside
the container. A gate that can be satisfied by the wrong tree is not a gate.

**The premise the measurement corrected (rule 13 — corrected in §2.6 decision 3, in the compose file, and here):**
`docker network ls` shows **two** mercato networks, and my worker was **alone** on `mercato-network`
(created by my own first version) while the operator's whole running stack — postgres, redis, mcp,
meilisearch, model, opencode, app, **and the pre-existing upstream Hermes** — sits on `mercato-network-local`
(`docker-compose.fullapp.yml` / `.fullapp.dev.yml` declare `name: mercato-network-${DEPLOY_ENV:-local}`;
`docker-compose.yml` hardcodes the other). Fixed to **external + `HERMES_DOCKER_NETWORK` default
`mercato-network-local`**, then proven: the worker attaches beside the stack; `docker compose -f
docker-compose.hermes.yml down` removed **only** `mercato-hermes-gateway` and left all 8 platform containers,
the network, and both `mercato-hermes-*` volumes intact (the stray empty `mercato-network` my first version
had created was removed once it had zero endpoints).

**What was measured and must NOT be misread:** the platform already ships a Hermes service —
`hermes-local`, image `nousresearch/hermes-agent:latest`, `command: ["gateway","run"]`, published on
`127.0.0.1:8642`, state on the `mercato-hermes-data-local` volume — added in the operator's Sprint 0 step
3.5. That is the upstream **HTTP** gateway from a floating `:latest` tag. This row's worker is the **pinned
source over stdio** — the door `hermes-gateway-client.ts` (`P2-2`) speaks and the port (`P2-3`) fronts.
They are two different doors; neither is wired into the app today (measured: **zero** `HERMES*` references in
`apps/mercato/src`). Which door the platform's chat ultimately uses is a `P2-5` decision, not this row's.

**What this row still does NOT claim:** the image is not `hermes-local`'s replacement, nothing calls it in
production, and the network default is an operator-environment measurement — a `fullapp` stack with a
different `DEPLOY_ENV` needs `HERMES_DOCKER_NETWORK` set (the compose file documents it).

### 2.7.1 OWNER RULING 2026-10-12 — **the upstream `hermes-local` HTTP gateway stays until `P2-5`, then it is retired** (registered as `CC-74`)

Put to the owner as one question with a recommendation, after the `docker ps` measurement found the stack
already running the upstream Hermes: keep it, retire it now, or retire it later. **Ruled (verbatim):**
*"we follow your recommendation as long as you note in the documentations when to retire it so we do not
forget that."* The recommendation accepted was **leave it until `P2-5` lands (engine selection at the door)
and the pinned worker has served a real chat run through it — then retire it in one change.**

**What was recorded so it cannot be forgotten, in the same change as the ruling:**
- `COMPLETION-CALLBACKS.md` **`CC-74`** — the full row: what the two doors are, the risk (the architecture's
  §10 *duplicate authority* risk, on a floating `:latest`), the trigger, and the five retirement steps.
- `docker-compose.fullapp.yml` — the retirement plan is now a **comment on the `hermes:` service itself**,
  the one place a future session will look when touching that stack.
- `docker/README.md` + `workspace/COOKBOOK.md` step 3.4 — the same pointer.

**Retirement, when the trigger fires (do all five, one change):** (1) confirm the pinned worker is behind the
door and has served a real chat run; (2) `docker compose -f docker-compose.fullapp.yml stop hermes` + remove
`hermes-local` — **leave the `mercato-hermes-data-local` volume in place** (owner's state; deleting it is a
rule-11 decision); (3) delete the service block, the `hermes_data` volume and the `HERMES_BIND`/`HERMES_PORT`
wiring; (4) update `workspace/COOKBOOK.md` steps 3.4/3.5 + `docker/README.md`; (5) cross-ref in §2.7 and `CC-74`.

---

## 2.8 `P2-3` — the requirement, measured before any adapter code was written (2026-10-12)

**Why this section exists (rule 3).** `P2-3` is the sub-row that stacks on the two discharged rows: the worker
boots (`P2-1`) and the client speaks its wire (`P2-2`). Everything below was measured in the pinned source
and in this repo FIRST, so the adapter cannot encode a guess.

**The two artefacts it stands on, measured:**
| Fact | Measurement |
|---|---|
| The door | `lib/ai-runtime-port.ts` — eight operations + the §4.2 envelope; `steerRun` documented *"only if the approval semantics exist"*; `resolveToolCall(call, capabilityGrant)` *"the ONLY path to a business operation"*. |
| The client | `lib/hermes-gateway-client.ts` (`P2-2`): `connect()` (the measured handshake), `on(method, listener)` (unwrapped events), `onServerRequest`, `onExit`, `request<TResult,TParams>()` (id-correlated), and the three typed helpers `submitPrompt(sessionId, text)` / `interruptSession(sessionId)` / `steerSession(sessionId, text)`. **The client has no session-create helper** — the adapter creates sessions through the generic `request('session.create', …)`. |
| Session lifecycle | `contracts/sessions.py`: **`session.create`** (`SessionCreateParams`: `cols?, source?, cwd?, messages?, parent_session_id?, title?, model?, provider?, reasoning_effort?, fast?, service_tier?, close_on_disconnect, hidden, idempotency_key?` — *"a stable caller-chosen key so a retried create returns the SAME session instead of a duplicate child"*, #65410) → `{session_id, stored_session_id, message_count, messages, info}`; **`session.resume`** → `LiveSessionSnapshot` (`running?`, `status?` (a `LiveSessionStatus`), `inflight?`, `queued?`, …); **`session.usage`** → `Usage` (`model, input, output, reasoning, total, calls, …`); **`session.status`** → `{output: str}`. |
| The turn | `prompt.submit` → `status ∈ streaming\|queued\|steered\|redirected`. Events (`contracts/events.py`, every one snake_case): `message.start` (**no payload**) · `message.delta` `{text, rendered?, verbose?}` · `reasoning.delta` (same shape) · **`message.complete`** `{text, usage?, status?, error?, failure_reason?, partial?, …}` with `TurnStatus ∈ complete\|error\|interrupted` · `session.usage` `{usage}` (*"mid-turn tick; `message.complete` carries the authoritative final usage"*) · `tool.start` `{tool_id, name, args?}` · `tool.complete` `{tool_id, name, result, summary?}` · `status.update` `{kind, text}` · `error`. |
| Cancel | **`session.interrupt`** `{session_id, expected_hosted_task_id?}` (*"only interrupt if this hosted task is the running one"*) → `{status: interrupted\|not_interrupted, interrupted?, turn_isolation?}`. |
| The 14 server requests | `client.capabilities` (§2.7): `approval, clarify, display.install.sudo, preview.act, preview.read, secret, setup_choose, sudo, terminal.read, tour, vault.code, vault.save_login, vault.unlock_prompt, window.read`. The port has no surface for them in this row; the client already answers anything unhandled `-32601`, so a turn never hangs. |

**§2.4's `session.steer` claim — SETTLED BY MEASUREMENT, and it holds, with three named limits.**
Measured in `contracts/sessions.py:629–641` + `methods_session_interrupt.py:82–144`:

```
SessionCorrectionParams(SessionParams): { session_id: str, text: str }
SessionCorrectionResult:               { status: queued|redirected|rejected, text: str }
"session.steer"    — "Inject text into the next tool result without interrupting the turn."
"session.redirect" — "Redirect the active turn (queued for the next turn while the agent is still building)."
handler: idle session → {status: rejected}; running + agent supports steer → {status: queued};
         agent lacks steer → JSON-RPC error 4010; text is required (4002); the session is resolved
         through the caller's own authority (`_current_session_steer_authority`), so the steer is ownership-checked.
```

**Verdict: `steerRun` is honestly supportable** — the first engine that can make the port's eight real
rather than seven. The approval semantics §4.1 requires are met in the only way this door can meet them:
a steer adds **instruction** to a run that is **already admitted** (its session is ownership-checked, it
creates **no new user turn**, and it carries **no capability**), so it cannot widen authority. **Three named
limits, carried into the adapter's docblock and its capability report:** (1) a `rejected` status means the run
was **not in flight** — the adapter **throws** rather than silently queueing, because the gateway's own
client would queue it as a normal next prompt and the platform's caller must make that choice itself; (2) a
steer is spliced into the **next tool result**, so it is visible only after the current tool finishes — that
timing is the engine's, and it is stated, not hidden; (3) steering reaches the worker's **own** tools — the
platform's tool door stays ✗ until `P2-4`, so what a steered turn can *do* is not yet platform-gated.

**The honest capability map this row must produce** (the OpenCode adapter's own standard — no pretending):
`describeCapabilities ✓ · startRun ✓ · streamRun ✓ · cancelRun ✓ · **steerRun ✓** · resumeConversation ✓ ·
resolveToolCall ✗ (P2-4) · completeRun ✓`. Health is reported from the **transport** (connected → `ok`,
otherwise `down`) — not a model probe: the worker needs neither a key nor a model to reach `gateway.ready`
(`P2-1`), and this door has no model-health endpoint. Usage from `message.complete` is emitted with
`usageScope: 'run'` (the turn) and the mid-turn `session.usage` ticks with `usageScope: 'session'` — §4.3
requires the scope to be stated, never guessed.

**What this row does NOT claim.** It does not select the engine for a chat (`P2-5`), does not deliver the
narrow tool (`P2-4`), does not move any caller, and performs no live model call — every proof here is
against the measured wire.

---

## 2.9 `P2-3` DISCHARGED — the port adapter, critic-hardened, with the three defects it found (2026-10-12)

**What landed (code commit in `starting-kit`).** `packages/ai-assistant/src/modules/ai_assistant/lib/hermes-port-adapter.ts` — `HermesPortAdapter implements AiRuntimePort`, standing on the `P2-2` client at a **structural** interface (`HermesGatewayPortClient`, fakeable without spawning the worker) — plus its suite `lib/__tests__/hermes-port-adapter.test.ts` (**34 tests**). One small contract change to the committed `P2-2` client: `onExit` now **returns an unsubscribe**, exactly like `on` (backward compatible — existing callers ignore the return).

**The evidence gate.**
- **37/37 GREEN** for the adapter; the **full package: 120 suites / 1665 tests GREEN** — the row breaks nothing that existed.
- **`tsc` honestly qualified:** **0** errors in the two new files (and 0 in the touched client), against the package's **92 pre-existing** `CC-73` errors, unchanged (measured with `--incremental false`, L139).
- **RED-then-GREEN:** **11 mutations, every one RED**, each restored md5-identical (`706ad202…`): the `D2` defect re-introduced · the `finally` cleanup deleted · a `rejected` steer swallowed · an errored/interrupted turn read as `done` · each usage scope swapped · `completeRun`'s replay guard removed · resume run ids collapsed · the idempotency key dropped · **the deadline check skipped · the deadline timer never armed**.

**The separate-agent hostile critic found three defects. Each was re-measured in the pinned source BEFORE the fix (rule 0b/13), not taken on the critic's word:**

1. **`D2` — correctness, the discharge blocker.** `resumeConversation` re-hydrated through `session.resume` and then **kept the caller's session id** as the run's session. Measured: `SessionResumeParams` takes the **stored id or an exact title** (*"the reply's `session_id` is the runtime id"*, `contracts/sessions.py`), and the gateway resolves every session-scoped RPC against its **live** sessions by the runtime id alone (`server.py::_sess_nowait` — a differing id is answered `4001 session not found`). So a resumed run whose stored id/title differs from the runtime id would 4001 on its **first turn**. The original fake echoed the requested id, so **all 33 tests passed with the defect present**. Fixed: the run adopts the reply's runtime id (the caller's value survives only as a fallback), with a covering test whose resume reply answers a *different* id and whose turn must then address it. **L144.**
2. **`D1` — test integrity.** The "unsubscribes every event listener" test asserted `prompt.submit` **call counts** around an emission — a number no emission ever changes, so it passed **with every `off()` deleted**. Rewritten to read the fake's live listener sets and exit-handler count, and to assert a post-settle frame reaches nobody. Mutation M2 (cleanup deleted) now fails it. **L145.**
3. **`D3` — a bounded leak.** `streamRun` unsubscribed its event listeners but never released its `onExit` handler, so a long-lived client accumulated one closure per streamed run. Fixed at both ends: the client's `onExit` returns an unsubscribe and `streamRun` releases it with the rest (the cleanup now covers **7 event listeners + the exit handler**).

**The honest capability map this row delivers** (§2.8's requirement, met): `describeCapabilities ✓ · startRun ✓ · streamRun ✓ · cancelRun ✓ · steerRun ✓ · resumeConversation ✓ · resolveToolCall ✗ (P2-4) · completeRun ✓`; health from the **transport**, never a model probe; usage scoped `run` (the turn, from `message.complete`) and `session` (mid-turn ticks), stated never guessed (§4.3).

**A premise corrected WHILE WRITING THIS RECORD (rule 13, applied to the critic's own claim).** The critic's C4 note said the port defines no deadline policy, so a wedged-but-alive turn could not be bounded. **Measured: false.** `lib/ai-runtime-port.ts`'s envelope carries **`deadline?: string | Date | null`** — *"a deadline, so a run cannot outlive its admission"* — a bound the **caller** already chooses (the OpenCode adapter ignores it; registered as **`CC-76`** so the door-level gap cannot be forgotten). So the adapter now **honours the envelope's own deadline**: a run whose deadline has already passed streams an error instead of spending a turn, a turn that outlives it ends with an error event, and an absent/`null`/unparseable deadline bounds nothing (a bound that cannot be read must fail safe, and is logged). **Three tests cover it**; mutations M9/M10 are the proof they bite. **L146.** What remains true is narrower than the first draft of this paragraph: nothing bounds a gateway that stays alive **without** an envelope deadline — that is now exactly what `CC-76` names, and it is no longer stated as a silent bound.

**What this row does NOT claim** (unchanged, and now proven): it does not select an engine for a chat (`P2-5`), does not deliver the narrow tool (`P2-4`), moves no caller, and makes **no live model call** — every proof is against the measured wire. **The one remaining named bound, written into the code rather than left implicit:** a steered instruction reaches the **worker's own** tools only (§2.8's third limit — the platform's tool door is still shut until `P2-4`).

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
| **P2-1** | **The worker boots.** `docker/hermes/` (image + entrypoint) and a compose service, mirroring `docker/opencode/`: pinned source mounted, `uv`-locked deps, the TUI gateway started on stdio, health from `ping`, config from `OM_AI_*` | ✅ **DISCHARGED 2026-10-12** — §2.7 holds the full record. Gate `docker/hermes/handshake_gate.py`: `client.capabilities` (all **14** `server_requests`), `gateway.capabilities` (`per_session_exclusive_submit: true`), `ping` → `{'pong': true}`, `gateway.ready` → `[change_events, replay_epoch, skin]`, `process.stop` — **GATE PASSED in 39.5 s**, no stub or mock, image built from the pin's own lock in 1m49 s. **RED:** the same gate against `hermes-agent-main-older` refused with `PIN BROKEN … 3e3b81f2… files 17367`, 0 stdout frames — cross-validating the container verifier against the host harness. Compose cold start re-proved the boot (`PIN HOLDS`, 18,248 files) on `mercato-network-local`, and `down` left the whole platform stack intact. **One premise corrected after the fact (rule 13):** the network is external + overridable — the first version copied `docker-compose.yml`'s hardcoded `mercato-network`, which the running stack does not use. |
| **P2-2** | **The gateway client.** `lib/hermes-gateway-client.ts`: spawn/supervise the worker, newline-JSON framing both ways, typed request/response correlation, the handshake, `prompt.submit` + the event stream, `session.interrupt`/`steer`, `process.stop` | ✅ **DISCHARGED 2026-10-12** (commit `f5f85064`). Against a **protocol stub implementing the measured contract** (§3.1/§3.2), all four behaviours proven: handshake (with the snake_case wire keys), one streamed turn as ordered typed events, cancel, and **a malformed frame does not kill the stream**. **21/21 tests.** Hostile-critic-hardened: a separate agent found 3 real defects (every event is an `event`-enveloped frame, so nothing dispatched; a pino-style logger call on a message-first logger; an unguarded `stdin.write`), each verified against the pinned source and fixed — and the critic's finding invalidated part of the suite, whose frames were the *un-enveloped* shape the real server never writes. **RED-then-GREEN:** mutating the envelope unwrapping turns **8 of 21 RED**; restored md5-identical (`4416a886…`) → 21 GREEN. **`tsc` clean — honestly qualified:** `P2-2`'s own two files are error-free, but the package's type gate **did not exist** (`tsc -p .` = TS18003; it was the only one of 21 configs not extending `tsconfig.base.json`). Fixing that surfaced **92 pre-existing errors in 27 other `__tests__` files**, scheduled as **`CC-73`** with the native-compiler and stale-`tsbuildinfo` measurements recorded as **L138/L139**. Any `tsc` run on this package must pass `--incremental false` to be reproducible. |
| **P2-3** | **The port adapter.** `lib/hermes-port-adapter.ts` implementing `AiRuntimePort`, with an **honest** capability map — measured against the client, ✗ where it is ✗ (no pretending; the OpenCode adapter's own standard) | ✅ **DISCHARGED 2026-10-12** — §2.9 holds the full record. **37/37 tests GREEN** (the event map, both usage scopes, the envelope's own deadline, idempotent start/cancel, replay-safe complete, the steer verdict's three limits, identifier distinctness); the **full package is 120 suites / 1665 tests GREEN**; `tsc` shows **0** errors in the new files against the 92 pre-existing (CC-73). The capability map is the honest one: **seven ✓, `resolveToolCall` ✗ (`P2-4`), `steerRun` ✓** — the first engine that makes the port's eight real. **Hostile critic (separate agent) found 3 defects, each verified against the pinned source before the fix:** `resumeConversation` kept the caller's stored id while the gateway resolves a turn by the **runtime** id only (the `D2` correctness defect — invisible to the original fake, which echoed the request); the unsubscribe proof was **vacuous** (it counted submits, which no emission changes); the `onExit` subscription was never released. All three fixed in the same change, and the critic's own "no deadline policy" aside was **falsified by measurement** (the envelope carries `deadline`; the adapter now honours it — the OpenCode half registered as `CC-76`, L146). **RED-then-GREEN:** **11 mutations, all RED**, restored md5-identical (`706ad202…`). **The one remaining named bound:** a steered instruction reaches the worker's own tools only (§2.8's third limit). |
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
