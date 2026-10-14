# PLAN — Hermes §9 **Phase 2: one tenant, one tool**

**Status: WRITTEN FIRST, per the working protocol** — *"Requirement = task definition + those points,
written BEFORE any code."* No Phase 2 code exists yet. This document is the requirement; the builds
below are executed against it, one sub-row at a time, under the full protocol (hostile critic,
RED-then-GREEN, two-route).

**Progress: `P2-1` ✅ (2026-10-12, §2.7) · `P2-2` ✅ (2026-10-12, §4) · `P2-3` ✅ (2026-10-12, §2.9) · `P2-4` ✅ (2026-10-13, §2.10) · `P2-5` ✅ (2026-10-13, §2.11) · `P2-6` ✅ (2026-10-13, §2.12 — the five properties, proven through the port) · **`P2-7` ✅ (2026-10-14, §2.13 — Hermes SERVED A LIVE TURN, twice, the second run production-shaped; the worker's model config is forwarded and guarded)** · **`P2-8` ✅ (2026-10-14, §2.14 — the worker's ws door is MOUNTED and the client CONNECTS it: a real turn served over the new transport with NO hand-spawned process, the `ping` health gate green, the default still `opencode`)** · **NEXT = `P2-9` — THE SWITCHOVER proper (ONE change):** the default-flip to Hermes + the OpenCode deletion (`R28-6`/`N-8`) + the `CC-74` `hermes-local` retirement, whose trigger is **fully met** since `P2-7`
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

*(**Clarified 2026-10-13, rule 13:** the ruling's *actual* trigger is **two** conditions — *"`P2-5` lands **and** the pinned worker has served a real chat run through it"* (below). `P2-5` is discharged, but **no live turn has ever been driven**, so the trigger is **not** met; the second condition is now **`P2-7` (§2.13)**.)*

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

## 2.10 `P2-4` — the requirement, measured before any gate code is written (2026-10-13)

**The owner's design input (2026-10-13), recorded verbatim because it decides the shape:**

> "A system agent converting propmt to business ir may have specific tools it need all the time. An AI user may need completely different tools and has to start wih a different one depending on the task in hand."

Read with the owner's ruling on this row's build shape — *"proceed with recommendations"*, i.e. the **two-gate design** recommended the same day from the measurement below. Two principles follow, and they are the requirement:

1. **The menu is decided at ADMISSION, from the agent.** A system-kind agent has a FIXED menu (the tools it needs all the time). A user-facing agent's STARTING menu is task-shaped — the task in hand selects the first tool. Neither is decided by the model mid-run.
2. **The DOOR enforces what admission allowed — it never widens.** A tool call executes only if (a) its tool is in the run's recorded menu AND (b) the run's own capability grant authorizes it. The runtime may narrow; it can never add.

**The measured facts (rule 0b — the code repo, 2026-10-13):**

| Fact | Evidence |
|---|---|
| Agent tool selection ALREADY EXISTS — per agent, not per kind | `AiAgentDefinition.allowedTools: string[]` (`lib/ai-agent-definition.ts:296`); `resolveAiAgentTools({agentId, authContext, boundScope})` builds the model's map from it, narrowed by any binding (`CC-55`, narrowing-only, `lib/agent-tools.ts:349-355`) and gated per tool by `checkAgentPolicy` (`lib/agent-policy.ts:157`) |
| The five kinds are an ownership concept, NOT a tool selector | `AGENT_KINDS = ['personal','role','context','independent','system']` (`ce.ts:54`) — nothing reads a kind to pick tools |
| The door is agent-BLIND | `resolveToolCall(call, capabilityGrant)` (`lib/ai-runtime-port.ts:354`) — no agent id, no menu. The envelope carries the real `agentId` (`:78`), so the identity is available at the call site through the run |
| The "grant" is a LABEL today | both chat routes mint `capabilityGrantId: chat-turn:${auth.sub}:${runId}` (`api/ai/chat/route.ts:791`, `api/chat/route.ts:531`); nothing resolves it → gate 2 is a correlation check until `CC-77` lands |
| The narrow tool exists, is LIVE on the tool door, and NO agent whitelists it | `ai-tools/business-ir-pack.ts` — `business_ir.run_query`, `requiredFeatures: ['ai_assistant.view']`, `isMutation: false`, handler scoped by the tool ctx only; the pack's own docblock: *"No agent whitelists it yet"* |
| NO agent is declared anywhere in production | `defineAiAgent` has ZERO call sites in `packages/` + `apps/`; the registry loads a generated file only (`lib/agent-registry.ts`) → the owner's "system agent" must be DECLARED by this row |
| The task-shaped menu is destination, not machinery | `pageContext` rides the run input (`attachRunInput`, `api/ai/chat/route.ts:799`) and nothing reads it to shape tools (`lib/agent-tools.ts:40` accepts it, unused) → `CC-78` |
| The worker's tool surface is CLOSED | the pinned worker loads its own toolsets (`agent/agent_init.py:1093 _load_tools(agent, enabled_toolsets, disabled_toolsets)`); the wire exposes no tool-registration surface (`tui_gateway/contracts/`) → the live "worker asks the platform" bridge is `CC-79` |
| Per-run rich data rides a measured rail, never the envelope | `attachRunInput(port, runId, input)` (`lib/agent-runtime-port-adapter.ts:473`) — *"the envelope carries references, not bodies (§4.2)… nothing the caller passes here enters it"* → the menu rides the same rail |

**What this row builds.**

1. **The runner agent declared** — a **module-declared built-in** (the platform's own agent; the five `kind`s — `ce.ts`'s `AGENT_KINDS` — are a field of *entity* agents, the user/tenant-created rows, so a built-in IS the owner's "system" side by construction), fixed menu `['business_ir.run_query']`, `requiredFeatures: ['ai_assistant.view']` (the pack's own requirement), chat execution. The owner's "specific tools it needs all the time". The module already declares the sibling `business_ir.query_author` (`ai-agents.ts` — no tools, `executionMode: 'object'`, read-only: the vision's rule that the model emits the IR, never arbitrary SQL); the new agent is the **runner** that needs that one tool all the time — the author inside the tool's chain does the conversion (bound per `CC-57`), this agent's whole job is being admitted with the tool and handing it the question.
2. **The menu recorded on the run at admission** — on the Hermes adapter's own carrier (the `attachRunInput` pattern; the envelope is never widened). The effective menu is computed by the EXISTING machinery (`resolveAiAgentTools`/`checkAgentPolicy`), so binding-narrowing and permission gating are inherited, not rebuilt.
3. **The two gates in `resolveToolCall`** — the first engine that can actually resolve a call. The call is correlated to its run (the stream already observes `tool.start {tool_id}`, so the adapter indexes call id → run), then **gate 1**: `call.toolName ∈ the run's recorded menu` (a call outside the menu is refused even WITH a grant — the agent's list is not advisory), then **gate 2**: the grant is present and is the run's OWN grant (absent or foreign → refused; the runtime never widens). Only then does execution reach the platform's existing tool door (`executeTool`) with the context taken from the run's admitted envelope, under the `S-02` rule the §4 row names. *(Build refinement, 2026-10-13: the implementation orders the checks **identity → authority** — the grant first, then the menu — so a caller holding a foreign grant learns nothing about what the run may call. Both gates still must pass and no exit-gate outcome changes; the only case the order affects is a foreign grant **and** a tool outside the menu, which is refused as `foreign_grant` rather than leaking the menu. Recorded, not silent.)*
4. **The honest map flips**: `resolveToolCall ✓` for the Hermes adapter — the port's eight operations are all real, for the first engine.

**What this row does NOT claim (named bounds, each registered in the same change):**

- **The features check stays at admission.** The envelope deliberately does not carry the acting person's features and the adapter has no request context, so execution runs with the admission-time context the run recorded. Re-deriving permissions at execution time is later work.
- **The grant is still a label.** Gate 2 proves the call belongs to THIS run under THIS run's grant; it does not yet prove the caller was permitted the operation, and it carries no expiry or scope. The grant resolver is **`CC-77`**.
- **The task-shaped starting menu.** The door enforces whatever admission records, so the later shaping plugs in at admission without reopening the door; the shaping mechanism itself is **`CC-78`**.
- **The live worker bridge.** The pinned worker cannot be offered a platform tool (closed toolset, no wire surface). This row proves the door through the port's own API (the §4.1 contract's own shape: the caller raises the call); the worker asking the platform live — the plugin `ctx.register_tool()` path plus the authenticated tool door — is **`CC-79`**, built and proven in the live-run rows.

**Exit gate.** (1) A call whose tool is NOT in the run's recorded menu is refused — with a valid grant in hand (the widening-refusal test). (2) A call without a grant is refused; a call under a foreign run's grant is refused. (3) A call inside the menu under the run's own grant executes through `executeTool` with the S-02 context (tenant/principal scope, on-behalf-of preserved). (4) `describeCapabilities` reports `resolveToolCall ✓` and the suite proves the three refusals plus the success path. (5) Nothing pre-existing breaks (full package suite); `tsc` 0-in-the-new-files against the 92 pre-existing (`CC-73`); mutations RED.

**DISCHARGE RECORD (2026-10-13).** Built, measured, and critic-hardened in one change.

- **What landed.** `lib/ai-tool-call-gate.ts` (the pure two-gate decision — `checkToolCallAdmitted` + `describeToolCallRefusal`); the Hermes adapter's `resolveToolCall` made real (correlation from `tool.start {tool_id}`, the two gates, execution behind an injected `HermesToolExecutor` that defaults to the platform's own `executeTool` under a fresh request container); the admission rail `attachRunToolMenu`; the runner agent declared in `ai-agents.ts` with the fixed menu `[BUSINESS_IR_RUN_QUERY_TOOL_NAME]`; the tool name exported as a constant in `ai-tools/business-ir-pack.ts` so the agent's menu and the registry cannot drift (C8).
- **Numbers.** The two new suites plus the updated `P2-3` suite are **94 GREEN** (`ai-tool-call-gate` 16 · `hermes-port-adapter-tools` 20 · `hermes-port-adapter` 37 · gateway client 21); the **full package is 122 suites / 1701 tests GREEN**; `tsc` is **92 errors — exactly the pre-existing count (`CC-73`), zero in the new or changed files**.
- **Hostile critic (separate agent) — 2 defects found, both fixed in the same change.** **F4 (real, §8):** `attachRunToolMenu` copied the menu array but stored the **context by reference**, so a caller that kept its reference could mutate it after admission and **widen execution authority** (`isSuperAdmin: true`, `userId: attacker`, widened `userFeatures`) — the critic proved it with a live probe and its output. Fixed by snapshotting the context field-by-field (including its `userFeatures` array); a regression test asserts the recorded snapshot is unmoved by a post-admission mutation. **F5 (partial, closed):** every test injected its own executor, so the **default** seam (the real `executeTool` under a fresh container) was unproven — "a dead path in production". Closed by a test that builds the adapter with **no** executor and asserts the default reaches `executeTool` with a fresh container and the admission-time context (the two platform entry points mocked, so no DI bootstrap). The critic also confirmed C1/C2/C3/C7/C8 upheld with commands+output, and noted `this.runs` is never pruned — **pre-existing (P2-3), and `P2-6`'s bounded-memory scope**, named here so it is not lost.
- **My own catch, before the critic.** The `P2-3` lesson L145 (a teardown must cover every exit path) applied to an **open**: `run.streamSink` was opened *before* `streamRun`'s three early-return guards (no text · not connected · deadline already passed), leaving a dead sink on a run that never streamed. Fixed by opening the sink only after every guard passes; a test asserts no sink exists when the stream never starts, and that it is released when the turn ends. **L147.**
- **RED-then-GREEN.** **10 mutations, all RED**, restored md5-identical (all five files verified against a pre-run `md5sum -c`): removing each of the four gate branches · reverting the F4 snapshot to a reference · opening the sink before the guards · skipping the gate call · lying in the capability map · breaking the call→run correlation · making the default executor a no-op. Each of the three new tests (F4 snapshot · sink lifecycle · default seam) is falsified by exactly one mutation, so none is vacuous. **L148.**
- **Named bounds (each registered the same change, §4 row + `COMPLETION-CALLBACKS.md`):** the features check stays at admission (`CC-77` — the grant is still a label); the task-shaped starting menu is destination (`CC-78`); the live worker bridge — the worker's closed toolset cannot be offered a platform tool on the wire — is `CC-79`.

---

## 2.11 `P2-5` — the requirement, measured before any selector code is written (2026-10-13)

**The owner's input (2026-10-13), recorded because it settles the one thing the §4 row left unnamed:**

> "proceed as you recommended."

The recommendation he approved, verbatim: *"the selector can choose Hermes; the default flips to Hermes when `P2-6`'s proof is green, and that same change deletes OpenCode."* So **this row's requirement owns the default-flip step** — the step no row owned when it was measured. `R28-6`'s trigger *requires* the flip ("an engine other than OpenCode … is selected by the door, and serves the chat run path") but does **not** own it; the gap is closed here rather than left to memory.

**The measured facts (rule 0b — the code repo, 2026-10-13):**

| Fact | Evidence |
|---|---|
| The engine choice is ONE **private** function inside ONE route | `resolveAiRuntimePort` (`api/chat/route.ts:118–126`) returns `createOpenCodePortAdapter({ auth, em })`. Not exported, not shared, not unit-testable in isolation |
| The other two adapter construction sites are a **different engine family** | `api/ai/chat/route.ts:762` and `api/ai/run-object/route.ts:195` call `createAgentRuntimePortAdapter(...)` — the platform's own in-process runtime, not the chat engine |
| The three adapters have **different** construction deps | `createOpenCodePortAdapter({auth, em})` · `createHermesPortAdapter(client: HermesGatewayPortClient)` · `createAgentRuntimePortAdapter({container, auth, input, …})` — a selector must know how to build each |
| **NOTHING in production constructs a Hermes client** | `grep -rn "new HermesGatewayClient" packages/ai-assistant/src` → **one hit, and it is a test** (`hermes-gateway-client.test.ts:193`). The worker's spawn command/args and its supervision exist only as the opt-in compose service (`docker-compose.hermes.yml`: `python -m tui_gateway.entry`, stdio) |
| The implementation name **already exists** on the door | `AiRuntimeCapabilities.implementation` (`lib/ai-runtime-port.ts:151`); `OPENCODE_RUNTIME_IMPLEMENTATION = 'opencode'` (`:404`), `HERMES_RUNTIME_IMPLEMENTATION = 'hermes'` (`hermes-port-adapter.ts:112`) |
| The run's ledger record has **no home** for it | `AiRuntimeRunResult.provenance` carries `policyVersion` / `modelVersion` / `correlationId` (`lib/ai-runtime-port.ts:250–254`) — **no `implementation`** |
| The envelope is server-minted and minimal, and must **NOT** be widened | §4.2 — identity + references only. `provenance` is already the ledger's own home (`:249`, *"Provenance for the ledger"*) |
| Config today is **env** | `OPENCODE_URL` (`opencode-client.ts:492`), `OM_AI_*` / `OPENCODE_*` provider+model; §3.4 rules that Hermes "takes the same shape … config from our env" |
| The door's structural proof must survive | `door-only-way-in.test.ts` (`R28-5`) asserts only the door / engines / adapters / barrel / two named exceptions reach an engine — a new selector module importing **adapters** is inside that rule |

**What this row builds.**

1. **The selector becomes config-selected.** `resolveAiRuntimePort` reads an env var (`AI_RUNTIME_ENGINE`, default `opencode` — the measured, consistent choice: every engine config today is env, §3.4) and constructs the named engine. OpenCode is the default, so **nothing changes for the product** until the variable says otherwise.
2. **The selector is the ONE construction site for the chat engine, and it is testable in isolation.** Extracted from the route to `lib/resolve-ai-runtime-port.ts`, so the row's own exit gate (*"swapping engines touches exactly one function"*) is **proved by a test** rather than asserted in a docstring. It imports **adapters**, never engines (inside `R28-5`'s rule).
3. **The Hermes branch is real, not a stub.** Selecting `hermes` builds a `HermesGatewayClient` with the worker's command/args from env (mirroring the compose service) and passes it to `createHermesPortAdapter`. This is the piece production has **never** had — measured above: only a test constructs one.
4. **The chosen implementation is recorded on the run.** The selector returns `{ port, implementation }`; the run's provenance carries it (`AiRuntimeRunResult.provenance.implementation` — an optional, engine-agnostic field). The **envelope is NOT widened** (§4.2 keeps it minimal and server-minted; `provenance` is already the ledger's home).
5. **The default-flip step is NAMED and OWNED here** — the gap this measurement found. *The selector can choose Hermes; the default flips to Hermes when `P2-6`'s exit-gate proof is green, and **that same change deletes OpenCode** (`R28-6`/`N-8`).*

**What this row does NOT claim (named bounds):**

- **The platform-runtime routes are NOT unified into this selector.** `api/ai/chat` and `api/ai/run-object` keep constructing their own adapter — a **different engine family** (in-process AI SDK, not the chat engine). Unifying them is a separate decision, not this row's.
- **OpenCode is untouched and still answers.** The default does not move in this row; it moves only when `P2-6` proves Hermes. This row makes the swap *possible*, not *done*.
- **`CC-76` is a co-requisite of the DELETION, not of this row.** The OpenCode adapter ignores the envelope `deadline`; deleting the engine before fixing it would close the gap *unmeasured* (the exact failure `CC-76` was registered to prevent). Fix it as its own change (rule 9a — `R28-2`'s file) before the flip-and-delete change.
- **`CC-74` fires at `P2-6`, not here.** The upstream `hermes-local` HTTP gateway is retired when this row is discharged **and** a real chat run has been served by the pinned worker — the trigger already written into `CC-74` and the compose service comment. *(**Corrected 2026-10-13, rule 13:** the premise *"`CC-74` fires at `P2-6`"* is **false** — §2.12 proved the five properties **through the port** (against a `FakeClient`) and drove **no live turn**, so the trigger's second half (*a real chat run served by the pinned worker*) was never met. That half is now its own row, **`P2-7` (§2.13)**; `CC-74` fires when **`P2-7`** is discharged.)*
- **`CC-77` unchanged** — the grant is still a label; nothing in this row resolves it.

**Exit gate.** (1) The selector is config-selected and the swap is **one function** — proven by a test that flips the env var and asserts the constructed port's `describeCapabilities().implementation` changes, with **no other file touched**. (2) `opencode` remains the default: with no env var set, the chat route builds the OpenCode adapter exactly as today. (3) The `hermes` branch builds a **real** client + adapter (no stub) and the run's provenance records `hermes`. (4) `door-only-way-in.test.ts` still passes — the door is still the only way in. (5) Nothing pre-existing breaks (full package suite); `tsc` **0 in the new files** against the 92 pre-existing (`CC-73`); mutations RED (md5-restored).

**The step this row hands forward (named so it cannot be forgotten).** When `P2-6`'s proof is green → **flip the default to Hermes and delete OpenCode in the same change** (`R28-6` / `N-8`), with **`CC-76` fixed first**. Cross-referenced in `COMPLETION-CALLBACKS.md` against `CC-72` (`R28-6`) and `CC-74` so the step is discoverable in the register, not only here. *(**Corrected 2026-10-13, rule 13:** *"`P2-6`'s proof is green"* was the wrong gate — §2.12 proved the five properties **through the port**, not the **live turn**. The gate is **`P2-7` (§2.13)**: when a live turn is proven → the switchover. Flipping on `P2-6` alone would make every chat **fail closed**.)*

**DISCHARGE RECORD (2026-10-13).** Built, measured, and critic-hardened in one change. **The default did NOT move** — this row makes the swap *possible*, not *done*; OpenCode is untouched and still answers every chat.

- **What landed.** `lib/resolve-ai-runtime-port.ts` (NEW) — the ONE config-selected construction site for the chat engine. It exports `resolveAiRuntimeEngine(env)` (env `AI_RUNTIME_ENGINE`, default `opencode`; **deny-by-default** — an unknown name throws, and a **set-but-blank** value is refused rather than silently falling back), `resolveAiRuntimePort({ em, auth, env?, engine?, hermesClient? })` returning `{ port, implementation }`, and `resolveHermesWorkerLaunch(env)` (the worker's argv, mirroring the compose service; a **JSON-array** form so an argument containing a space — a Windows path — is expressible). The route's private `resolveAiRuntimePort` was **deleted**; `api/chat/route.ts` now imports `{ resolveAiRuntimePort }` from the new module and takes `textInputRef` (a pure helper, never a factory) from the OpenCode adapter. The chosen engine is recorded on the run: `AiRuntimeRunResult.provenance.implementation` (an optional, engine-agnostic field — **the envelope is NOT widened**, §4.2), set by **both** adapters' `completeRun` on the first completion so a replay cannot rewrite it, and `mintChatRunId(conversationId, startedAt, implementation)` now takes the engine as a **required third argument** (so a Hermes run cannot be mislabelled `opencode`).
- **Numbers.** The new `resolve-ai-runtime-port` suite (15 tests) plus the four updated suites are **124 tests GREEN across 6 suites**; the **full package is 123 suites / 1723 tests GREEN**; `tsc` is **92 errors — exactly the pre-existing count (`CC-73`), zero in the new or changed files**.
- **Hostile critic (separate agent) — 2 real defects found, both fixed in the same change.** **C5 (serious):** the requirement asserted the run's ledger entry "must say WHICH engine" and added `provenance.implementation`, but **no adapter read `result.provenance`** — the field was accepted and **dropped**. Fixed symmetrically in **both** adapters: each run record gained `implementation?: string` and each `completeRun` records `result.provenance?.implementation`, with a test on each half. **C3 (partial):** a **set-but-blank** env value (`''` / whitespace) silently selected `opencode`, so an operator who meant Hermes would believe Hermes was serving — now **refused** ("is set but empty — refusing to guess …"), making the requirement's "deny-by-default" wording literally true. Two **WEAK tests** the critic flagged were also fixed: the route's "constructs no adapter" check was a substring scan (now pins the **exact symbol list** of its `opencode-port-adapter` import — `toEqual(['textInputRef'])`), and the selector's "names no engine" check matched only `from '…'` (now covers `from` / `require` / `import()`).
- **RED-then-GREEN — and the proof itself had to be repaired before it could be trusted (L149/L150).** The first harness reported "13/13 RED" in **1 second**, which is impossible for 13 jest suites: a node harness that spawns jest via `execFileSync`/`spawnSync` throws **`EBUSY`** on Windows in this sandbox, so **every** mutation was reported RED **without jest ever running** — a false positive. The harness was rebuilt as a **bash** loop that spawns jest directly, and it now proves a **GREEN baseline for every targeted suite BEFORE trusting any RED**, and requires jest's own `Tests:` line (a jest that fails to *start* is an ERROR, never a RED). Two defects surfaced in the same pass: (a) the new suite called the **real** `handleOpenCodeHealth` (a live HTTP probe + DI container), so it hung to the jest timeout whenever Docker was down — a unit test depending on a live service; fixed by mocking `../opencode-handlers`, as the adapter's own suite does. With the repaired harness: **5 baselines GREEN, then 13 mutations all RED**, restored md5-identical (`resolve-ai-runtime-port.ts` `313a0d11…` · `route.ts` `6c899669…` · `ai-runtime-port.ts` `c1069f28…` · `opencode-port-adapter.ts` `bae649f7…` · `hermes-port-adapter.ts` `46196ab7…`). Each mutation removes exactly one thing: the default · the set-but-blank refusal · the unknown-name refusal · the implementation name · the env read · the run-id engine · the recorded provenance · each adapter's recording · the no-factory import · the required third argument · the JSON argv · the worker-command default.
- **Named bounds (unchanged, each registered in the same change):** the platform-runtime routes (`api/ai/chat`, `api/ai/run-object`) are a **different engine family** and are NOT unified here; the default does not move until Hermes serves a **live turn**; `CC-76` (OpenCode ignores the envelope `deadline`) is a co-requisite of the **deletion**, not of this row; `CC-74` fires once a real chat run has been served by the pinned worker; `CC-77` unchanged (the grant is still a label). *(**Corrected 2026-10-13, rule 13:** this line originally read *"the default does not move until `P2-6` is green"* and *"`CC-74` fires at `P2-6`"* — both **false**, because §2.12 scoped `P2-6` to the five properties **through the port** and drove no live turn. Both now name **`P2-7` (§2.13)** as the gate.)*

---

## 2.12 `P2-6` — the requirement, measured before any exit-gate code is written (2026-10-13)

**What this row is.** The phase's **exit gate**: prove, on **one tenant**, the five properties the architecture requires of a runtime behind the door — **cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access** — then prove the last one **adversarially, with two tenants**. It is a **proof row**: the gate is not *"code exists"* but *"the five are measured"*. Where the measurement finds a property that is **not yet true**, this row **builds the missing bound** — exactly as `P2-3` built the `deadline` honouring the contract already required.

**The measured facts (rule 0b — the code repo, 2026-10-13):**

| Fact | Evidence |
|---|---|
| The contract already carries **every shape** the gate needs | `budget` (`AiRuntimeBudget`: tokens/milliseconds/amount, `lib/ai-runtime-port.ts:116-125`), `deadline` (`:108-109`), `usage` + a **stated** `usageScope` (`:199-203`, `:240-248`), and cancel/complete results specified **idempotent / replay-safe** with reasons (`:215-283`) |
| **Cancellation is implemented in both adapters, idempotently** | `cancelRun` returns a **value with a reason**, never throws — Hermes `hermes-port-adapter.ts:557`, OpenCode `opencode-port-adapter.ts:310`; the route already drives cancel-then-complete (`closeChatRun`, `R28-4`) |
| **`completeRun` is replay-safe in both** | a `completed` guard on the run record — Hermes `:793`, OpenCode `:413` (a second call reports `alreadyComplete`, changing nothing) |
| **Usage is mapped by both, run-scoped** | Hermes from `session.usage` + the authoritative `message.complete` usage (scope `run`, `:469-480`, `usageEvent` `:919`); OpenCode from the engine's `metadata` (`toPortEvent`, `:139-149`, `usageScope: 'run'`) |
| The envelope's **`deadline` is honoured by Hermes** (a pre-stream check + a timer, §2.9) and **ignored by OpenCode** | Hermes `:395-413`, `:510-533`; OpenCode reads no deadline — registered as **`CC-76`** |
| The envelope's **`budget` is honoured by NEITHER adapter** | every `budget` reference in the package is in `lib/agent-runtime.ts` (the platform's **own** engine, `:220-517`); **none** in the two port adapters — so `AiRuntimeBudget` is carried and dropped, the exact defect `P2-3` found for `deadline` |
| **The run registry is never pruned** | `this.runs` (a `Map`) grows for the process's life in **both** adapters; the only `delete` is `toolCallRuns.delete(callId)` (Hermes `:539`) — named as `P2-6`'s scope in §2.10 |
| **`cancelRun`/`streamRun` take only a `runId` — no tenant** | so isolation today rests on the adapter being **per-request**: the route calls `resolveAiRuntimePort` once per request (`api/chat/route.ts:328`) and the selector holds **no module-level singleton** (`lib/resolve-ai-runtime-port.ts`) — each request gets a fresh registry |
| The tenant is derived from **auth**, server-side, never from the runtime | `api/chat/route.ts:520-532` (`auth.tenantId`); stored on the run (`HermesLiveRun.tenantId`, `admitted.tenantId`) and used only to mint a resume run id |

**What this row builds.**

1. **The exit-gate proof suite** — one suite that measures all five on **one tenant**, end-to-end through the port: cancel · replay-safe complete · run-scoped usage · bounded memory + `deadline`/`budget` · a single-tenant isolation baseline.
2. **Bounded memory.** The run registry is **capped and pruned**: terminal runs (completed/cancelled) are evicted and a hard ceiling bounds the retained entries, so a long-lived adapter cannot grow without bound (the gap §2.10 named). Asserted by a test that drives more runs than the cap and reads the retained count.
3. **Bounded CPU/cost.** Both adapters **honour the envelope's `budget`** — wall-clock at minimum (mirroring the `deadline` honouring `P2-3` added), tokens where the engine reports them — so a budget is a bound, not a decoration. *(The `deadline` half is already honoured by Hermes; `CC-76` covers OpenCode's `deadline` and is fixed here, since the gate cannot pass with an unread bound.)*
4. **The adversarial two-tenant negative test.** Two adapters (two tenants), each with its own run: **a run admitted for tenant A cannot be read, named or affected by tenant B** — asserted on the registry (B's `runId` is absent from A's adapter) **and** on the frames sent to the worker (no frame for A's run carries B's identifiers). The test **fails if any cross-scope frame exists**.
5. **The usage-capture proof.** Usage is run-scoped, its scope is **stated**, and an **unknown provider stays unknown** — never fabricated into a paid figure (§4.3).

**What this row does NOT claim (named bounds).**

- **The network policy and the disposable-sandbox threat model are Phase 6's.** This row proves *quota-bounded* (`Sandbox` stays ☐).
- **Export, backup, delete and retention are Phase 4's.** This row proves *isolation* (`Runtime state` stays ☐).
- **The `Port` boxes stay ☐** — a box is never ticked while its siblings are open (`secretRefs` unpopulated + `CC-70`).
- **The default does not flip here.** `P2-6`'s green proof is the **trigger** for §2.11's owned flip + OpenCode deletion — a **separate** change, with `CC-76` fixed first. This row proves; it does not flip.
- **No box moves** (expected, and reported as such if so).

**Exit gate.** (1) **Cancellation** — a cancelled run records `cancelled`; a second cancel is `already-cancelled`, not an error. (2) **Retry idempotency** — a re-delivered `startRun` and `completeRun` change nothing (`alreadyComplete`), with usage **not double-counted**. (3) **Usage capture** — run-scoped, scope stated, never fabricated. (4) **Bounded memory/CPU** — the registry is capped/pruned (proven by driving past the cap) and the envelope's `deadline` **and** `budget` bound the run. (5) **No cross-scope access** — with **two adversarial tenants**, tenant A's run cannot be read, named or affected by tenant B, proven by a negative test that fails if any cross-scope frame exists. (6) Nothing pre-existing breaks (full package suite); `tsc` **0 in the new files** against the 92 pre-existing (`CC-73`); mutations RED (md5-restored).

**DISCHARGE RECORD (2026-10-13).** Built, measured, and critic-hardened in one change. **The default did NOT move** — this row *proves*; the flip + OpenCode deletion is a **separate** change (§2.11 item 5). `CC-76` is **fixed here** (it was the co-requisite of the gate).

**What landed.** **`lib/ai-runtime-bounds.ts` (NEW)** — the run's bounds in **ONE** shared file, so the engines cannot drift: `DEFAULT_MAX_RETAINED_RUNS = 256`; `resolveRunDeadline(envelope, admittedAt)` (the **sooner** of an absolute `deadline` and `budget.milliseconds` measured **from admission**; an absent bound is **not** a zero bound; an unreadable bound is logged and bounds nothing; a numeric-string budget is accepted, not dropped); `pruneRunRegistry(runs, cap)` (evicts **finished** runs oldest-first, **never** a live one). **Both chat adapters** (`hermes-port-adapter.ts`, `opencode-port-adapter.ts`) apply it — `admittedAt` on the run, a prune after every insert, `resolveRunDeadline` in `streamRun`, a `retainedRunCount()` test seam. **`CC-76` FIXED** — OpenCode now honours the envelope's time bound (a pre-stream check + a timer that **settles** `streamRun`). **The platform adapter** (`agent-runtime-port-adapter.ts`) — the **third** `AiRuntimePort` implementation — applies the **memory** bound. **Three proof suites:** `__tests__/ai-runtime-bounds.test.ts` (the rules at their own boundary), `__tests__/exit-gate.test.ts` (the five on one tenant + the two adversarial tenants), and the registry-bound tests added to the three adapter suites.

**The five, measured (one tenant).** (1) **Cancellation** idempotent — cancelled → already-cancelled → already-complete → not-found, each a *value with a reason*, never an error. (2) **Retry idempotency** — one `session.create`; `{completed:true, alreadyComplete:false}` then `{completed:false, alreadyComplete:true}`. (3) **Usage** — a session tick + the run total, scopes `['session','run']` **stated**. (4) **Bounded memory/CPU** — driving `cap+25` finished runs keeps `retainedRunCount() <= cap+1`, the oldest finished run evicted, the live one kept; an expired `deadline` **and** an expired `budget` spend no turn; a budget still **in force** does not block. (5) **No cross-scope access** — with two adversarial tenants, A cannot read/name/affect/stream B's run, and **no cross-scope frame** exists.

**Hostile critic (separate agent) — 2 defects + 2 honesty nits, all fixed in the same change.**
- **D1 (defect, high): the OpenCode time bound did not END the run.** Its timer set a flag and emitted an error but left `await handleOpenCodeMessageStreaming` **pending**, so a **stalled engine** left `streamRun` awaiting forever — the bound bounded nothing, and the two engines **drifted** (Hermes' timer calls `settle()`, ending the stream). Fixed by racing the engine call against a deadline promise; a regression test proves a stalled engine still **ends** at the bound (**L151**).
- **D2 (defect, medium): a THIRD `AiRuntimePort` implementation was unbounded.** §2.12 named "both adapters"; `agent-runtime-port-adapter.ts` (the platform in-process engine) had no cap either. Since the memory bound is stated for "the run registry" (not two named adapters), the third now applies the same shared rule; its wall-clock bound is **named** (it does not own its byte stream), so CPU stays the two stream-owning engines' (**L152**).
- **D3 (nit): a stringified `budget.milliseconds` was dropped silently.** Now a numeric string is accepted and an unusable value is **logged**, like the unparseable deadline.
- **NIT (honesty): 4 of 8 "no cross-scope frame" assertions were vacuous** — no frame ever carries **any** tenant/principal id (only `idempotency_key`/`session_id` travel), so asserting their absence could not fail. Rewritten to the two identifiers that **do** travel, each paired with a positive check (**L145**/**L152**).

**Gates.** Full package suite **125 suites / 1752 tests GREEN**; `tsc` **92 = the pre-existing `CC-73` count, 0 in the P2-6 files** (the first run showed **4 new** — the mistyped-budget test, where the type says `number` and the value is a string — fixed by *simulating* the wire value with a cast, not by weakening the check); **RED-then-GREEN: 10 mutations, all RED**, restored **md5-identical** (a bash harness, baselines proven GREEN first — L149).

**Named bounds (unchanged).** Network policy + the disposable-sandbox threat model are Phase 6's; export/backup/delete/retention are Phase 4's; the `Port` boxes stay ☐ (a box is never ticked while a sibling is open); **no box moves** (reported as such). **This row proves; it does not flip.**

**CORRECTION (2026-10-13, rule 13 — the premise "`P2-6` is green" was only half-true).** This discharge is **correct for §2.12's scope** — the five properties, proven through the port. But §2.11's record (and the selector's docblock) states `P2-6`'s gate as *"serving a live turn over Hermes"*, and §2.11 says `CC-74` fires at `P2-6` when *"a real chat run has been served by the pinned worker"*. **§2.12 did not write that half, and it was not built** — the proof ran against a `FakeClient`, and no live turn has ever been driven (measured: `prompt.submit` exists only in the client/adapter, never executed outside `__tests__`; the handshake gate drives no turn). So **the default-flip + OpenCode deletion (§2.11 item 5) is NOT yet due** — and it could not run anyway: production never calls `HermesGatewayClient.connect()`, so a `hermes`-selected chat **fails closed** at `startRun`. The missing half is now its own row, **§2.13 (`P2-7`)**.

---

## 2.13 `P2-7` — the requirement: Hermes must SERVE A LIVE TURN (the half of `P2-6`'s *stated* exit gate that §2.12 did not write) — measured before any code (2026-10-13)

**Why this row exists — a premise corrected, not hidden (rule 13).** `P2-6`'s **stated** exit gate — in §2.11's own record, and in the selector's docblock written during `P2-5` — is *"serving a live turn over Hermes is `P2-6`'s exit gate"*, and §2.11 (lines 372, 385) says **`CC-74` fires at `P2-6`** *"when … a real chat run has been served by the pinned worker"*. But §2.12 — the requirement actually **written** for `P2-6` — scoped the gate to *the five properties, proven through the port*, and the discharge proved exactly that, **against a `FakeClient`**. So the word "green" was **true of §2.12 and false of §2.11**: the five properties are proven, **no live turn has ever been driven**. This row builds the other half. **The default-flip + OpenCode deletion (§2.11 item 5) is therefore NOT yet due** — flipping now would make every chat **fail closed** (measured below).

**The measured facts (rule 0b — the code repo + the live stack, 2026-10-13):**

| Fact | Evidence |
|---|---|
| **No live turn has EVER been driven** | `prompt.submit`/`submitPrompt` appear **only** in `hermes-gateway-client.ts` + `hermes-port-adapter.ts` (never outside `__tests__`); `docker/hermes/handshake_gate.py` drives only `ping`/capabilities/`gateway.ready`/`process.stop` — **no turn** |
| **Production never connects the worker** | the only `.connect(` calls in the package are MCP clients; **no** `HermesGatewayClient.connect()`; `hermes-port-adapter.ts:346` **throws** `"not connected"` at `startRun` |
| **The connection lifecycle is unbuilt** | no `connectOnce`/singleton/`ensureConnected` anywhere; §2.11's docblock deferred it (*"one worker per process, connected once … belongs with the live run, not with the selection"*) |
| **The worker is UP** | `docker ps` → `mercato-hermes-gateway` Up 31h (image `hermes-gateway:p2-1`) |
| **The worker's model config is MIS-WIRED** | its env carries `OM_AI_PROVIDER=openai` + `OM_AI_MODEL=Qwen2.5-7B-Instruct-Q4_K_M` (a **local** model) but **no `OPENAI_BASE_URL`**; `.env` sets `OPENAI_BASE_URL=http://model:8080/v1`, but `docker-compose.hermes.yml:64-80` **does not forward it** → the worker would call **api.openai.com** with a local model name |
| **A local model is UP** | `mercato-model-local` (llama.cpp, OpenAI-compatible) Up 33h; the app reaches it via `OPENAI_BASE_URL=http://model:8080/v1` |
| **The old door is still up** | `hermes-local` (upstream `:latest`, HTTP 8642) Up 33h — the `CC-74` retirement target |

**MEASURED — the worker's own model-config mechanism (rule 0b, the pinned source + the live container, 2026-10-13).** So the build is not a guess:
- **The worker ignores `OM_AI_PROVIDER`/`OM_AI_MODEL`.** They appear nowhere in its config system (its provider registry is `hermes_cli/auth.py` + `hermes_cli/providers.py`, keyed on `HERMES_*` / provider-specific env vars).
- **It resolves its provider from `config.yaml model.provider`, else auto-detects from which API key is present** (`hermes_cli/auth.py:1629 resolve_provider()`). With `OPENAI_API_KEY=local` set and **no** config, it auto-detects **`openai-api`** — whose transport is **`codex_responses`** and whose base URL is **`OPENAI_BASE_URL`** (`auth.py:177`, `providers.py:34-35`), which the compose does **not** forward → it would call `https://api.openai.com/v1`.
- **Its model** comes from `HERMES_MODEL`/`HERMES_INFERENCE_MODEL` (env) or config `model` (`tui_gateway/server.py:1544-1561`) — neither is set → a silent default.
- **`HERMES_HOME=/var/lib/hermes` holds no `.env` and no config** (measured in the container) → the worker has **no model configured at all**.
- **The local server supports BOTH transports:** `mercato-model-local` answers `/v1/chat/completions` **200** *and* `/v1/responses` **200** (model id `/models/Qwen2.5-7B-Instruct-Q4_K_M.gguf`; it accepts any requested model name). So the `openai-api` (`codex_responses`) path is **viable** — the minimal fix is to **forward `OPENAI_BASE_URL` and set `HERMES_MODEL`** in `docker-compose.hermes.yml`.

**What this row builds.**

1. **The live-turn proof.** A harness that drives a **real** turn through the port with the Hermes engine selected: connect the pinned worker → `session.create` → `prompt.submit` → read the adapter's ordered typed events, ending on a real `done`/`message.complete`. **A real model answer, not a fake** — the exact thing §2.11 named as `P2-6`'s gate.
2. **The worker's model config, settled and forwarded.** Whatever the pinned worker actually reads to reach a model (measured in the worker's own source, not assumed from the platform's `OM_AI_*` convention) must be **forwarded by `docker-compose.hermes.yml`**, so the worker reaches a **reachable** model — the local one by preference (no cloud spend).

**What this row does NOT claim (named bounds).**

- **It does not flip the default.** The **switchover** — build the production **connection lifecycle**, flip the default to Hermes, delete OpenCode (`R28-6`/`N-8`), retire `hermes-local` (`CC-74`) — is the **next** row, gated on this one. This row may prove the turn with an **explicit** connection; productionising the connection is the switchover's.
- **The tool bridge stays `CC-79`** (the worker's closed toolset cannot be offered a platform tool on the wire).

**Exit gate.** A real turn is served through the pinned worker and its events are the adapter's **typed** events (proved with the command + its output); the worker's model config is **named** and reachable; nothing pre-existing breaks (full package suite); `tsc` **0 in the new files** against the 92 pre-existing (`CC-73`); mutations RED (md5-restored).

**The step this row hands forward (named so it cannot be forgotten).** When a live turn is proven → **the switchover**: the connection lifecycle, the default-flip, the OpenCode deletion, and the `hermes-local` retirement — one change, as §2.11 item 5 owns.

---

### 2.13.1 `P2-7` — DISCHARGE RECORD (2026-10-14)

**The live turn is proven — TWICE, through the pinned worker — and the second run is PRODUCTION-SHAPED: the compose change alone serves it.**

**The evidence — the production-shaped run (the exact gate this row named; command + output).** From `workspace/starting-kit`, with `P2_7_EXTRA_ENV` **unset** so the worker reads the **container's own env** (the container was recreated from `docker-compose.hermes.yml` after the fix — no injected vars at all):

```
P2_7_TIMEOUT_MS=2700000 node_modules/.bin/tsx packages/ai-assistant/scripts/hermes-live-turn.mts
# the same command the new `p2-7:live` script wraps
```

The decisive lines of its output (captured to a file at launch — **L155**):

```
  spawn: docker exec -i mercato-hermes-gateway python -m tui_gateway.entry
  handshake: perSessionExclusiveSubmit=true serverRequests=14
  startRun: runId=p2-7-live-1791943817392 runtimeSessionId=242048e3
    evt session.info :: {"model":"Qwen2.5-7B-Instruct-Q4_K_M","provider":"openai-api",…}
    evt session.usage :: {"usage":{"model":"Qwen2.5-7B-Instruct-Q4_K_M","input":10646,"output":6,…,"total":16731,"calls":1,…}}
    evt message.complete :: {"text":"HERMES LIVE TURN OK","usage":{…}}
  typed event types: ["status","text","text","text","text","text","metadata","metadata","done"]
  ANSWER: "HERMES LIVE TURN OK"
  PASS — a real turn answered and ended on done (9 events) in 1955.4s
  worker events seen: 20
exit=0 finished 2026-10-14 04:42:53
```

The model's own log confirms the turn from the other side: `total time = 1912921.15 ms / 10652 tokens`, slot released. **The first run** (pre-deploy, `HERMES_TUI_TOOLSETS=search` injected to shrink the prompt) passed the same way — 6105-token prompt → 608s prefill, a 626.5s turn, the same answer, typed events ending on `done`, exit 0. **Why the second run matters:** run 1 injected a toolset pin to make the turn fast; run 3 injected **nothing** — so it is the proof that the **forwarding** works, not merely that the harness does.

**The worker's model wiring — what landed, and what now guards it.** `docker-compose.hermes.yml` forwards the three vars the worker actually reads (all measured in the table above): **`OPENAI_BASE_URL`** (the auto-detected `openai-api` provider's endpoint — without it the worker calls `api.openai.com` with a local model name), **`HERMES_MODEL`** (the worker's model — it does **not** read `OM_AI_MODEL`), and **`HERMES_LOCAL_STREAM_STALE_TIMEOUT: 2400`** (the measured prefill grace; the worker's 900s default aborts every real turn on this stack). The forwarding is **guarded**: `__tests__/hermes-worker-wiring.test.ts` parses the service's `environment:` **mapping** — a key that appears only in a comment does **not** satisfy it, and the anti-vacuity test proves the parse is not a substring search in disguise.

**The harness's judgement is separated from its plumbing.** `scripts/hermes-live-turn.mts` drives the turn; `lib/hermes-live-turn-verdict.ts` (pure, unit-tested) decides pass/fail: **no `error` anywhere, `done` present AND last, and a non-empty assembled answer** — each a separate mutation. A regression that blinds the harness turns that suite red in milliseconds instead of after a 27-minute live run (L150's discipline, applied to a harness).

**The gates.** 19 tests across the two new suites; the **full package is 127 suites / 1771 tests GREEN** (= 1752 + 19) — measured under the repo's **pinned Node 24** (under the shell's node 22.22.2, `isolated-vm`'s missing win32 abi-127 prebuild stops two suites from even **loading** — a false "2 failed" reading; **L154**; the same Windows limitation has been recorded since `P2-1`); `tsc` **92 = the pre-existing `CC-73`, 0 new**; **7 mutations all RED**, restored md5-identical (`hermes-live-turn-verdict.ts` `53cf7e55f6867aa7fe295da897d307f5`, `docker-compose.hermes.yml` `3b4831c8a2c1f6d56eaf89bf89c11cfc`).

**Two corrections made while discharging (rule 13).** (1) The grace value first chosen here (**1800s**) was justified by the 6105-token measurement, while the DEFAULT-toolsets prompt measures **10,988 / 10,646 tokens**; the comment now cites all three measured turns (608s / 1583s / ~1905s) and the value beats the slowest with 495s of margin. (2) The interim prompt-size estimate (`progress = 0.47` → ~4,355 tokens) was **2.5× off** the model's own `prompt eval time` line — recorded as **L153**, and the estimate was never used to size anything.

**What this row did NOT do (named bounds, unchanged).** The **default did not move**; production still never constructs the worker connection — the connection lifecycle is the switchover's first build, and until it lands a `hermes`-selected chat still **fails closed** at `startRun`. **`CC-79`** (the live worker bridge) stays open — this turn raised no platform tool. **No box moved** (ONE NUMBER unchanged at **78 / 321 = 24%**, 30th re-run, two routes agree).

**Next: the switchover.** One change, §2.11 item 5 owning it — the production **connection lifecycle** → the **default-flip** to Hermes → the **OpenCode deletion** (`R28-6`/`N-8`) → the **`hermes-local` retirement** (`CC-74`, whose trigger is now **fully met**: the selection half by `P2-5`, the live-run half by this row). **Its requirement is §2.14, below — written before any code.**

---

## 2.14 `P2-8` + `P2-9` — THE SWITCHOVER: the requirement for the production connection lifecycle, the default-flip, the OpenCode deletion and the `hermes-local` retirement — measured before any code (2026-10-14)

**Why this row exists.** `P2-7` proved the pinned worker serves a real turn through the port. What remains is what makes that the platform's answer: production must be able to **connect** the worker (today nothing does — `P2-7`'s harness drove `docker exec` by hand), and once it can, the default engine flips to Hermes, OpenCode is deleted and the old `hermes-local` door is retired — **one change**, as §2.11 item 5 owns.

**The measured facts (rule 0b — the live stack + the pin, 2026-10-14):**

| Fact | Evidence |
|---|---|
| **The app cannot spawn the worker itself** | the app container (`starting-kit-app-1`, image `open-mercato/app:local`) has **no Python** (`command -v python3` → nothing); the worker is a Python program that runs from the pin's mounted source. Spawning it as the app's child means putting the pin **and** a Python runtime inside the app image — a different deployment, not a connection |
| **The app has no Docker socket** | `/var/run/docker.sock` is mounted only into **traefik** (label discovery), and only in the traefik variant — so the harness's `docker exec` shape is **not available** to production |
| **The pinned worker serves one transport today** | `tui_gateway/entry` runs the stdio JSON-RPC gateway; `stdin_open: true` in the compose is what keeps the worker alive waiting for a client |
| **The pin's protocol is transport-independent** | `tui_gateway/ws.py`: *"WebSocket transport for the tui_gateway JSON-RPC server: reuses `tui_gateway.server.dispatch` verbatim … Wire protocol is identical to stdio (newline-delimited JSON-RPC both ways; `gateway.ready` right after accept)"* — but it is a **library a host mounts** (`@app.websocket("/api/ws")` → `handle_ws(ws)`; the mounting pattern is demonstrated in `evals/liveness/ws_orphan_reconnect.py:61-63`), and **nothing in `tui_gateway/entry` mounts it** (the desktop product mounts it in-process — `hermes_cli/main.py:2680`) |
| **The old door is a DIFFERENT contract** | `gateway/platforms/api_server.py` is an **OpenAI-compatible HTTP API** (`/v1/chat/completions`, `/v1/models`, …; *"any OpenAI-compatible frontend connects at http://localhost:8642/v1 with API_SERVER_KEY"*) — that is the `hermes-local` service this row retires (`CC-74`), **not** the door the port speaks |
| **The ws route has an auth story** | `hermes_cli/dashboard_auth/ws_tickets.py` — server-spawned WS clients authenticate with a **ticket**; the pin's own eval clients pass `?token=…` |

**The options for the production connection (measured; the owner decides — rule 11).**

1. **The worker serves the ws transport; the app connects to a URL.** A small **FastAPI/uvicorn** host (from the pin's own mounting pattern — *rule-13 correction 2026-10-14: this line said "aiohttp" before the worker image was measured; aiohttp is NOT installed there, and the pin's own reference mounting is FastAPI+uvicorn — see the runtime measurement below*) runs inside the **worker's** container — that image already has Python and the pin — and listens on `mercato-network-local`. The platform's client speaks the **identical** protocol over a WebSocket instead of a child pipe. Mirrors OpenCode's shape exactly (a supervised service + a URL + a health gate — plan §3.4). **Recommended.**
2. **`docker exec` from the app (the harness's shape).** Requires the Docker socket inside the app container — a privilege that turns every chat into root-equivalent control of the host. **Rejected** (the socket is not mounted, and mounting it would be a §8 regression).
3. **Put Python + the pin in the app image.** Possible, operationally heavy — the app image doubles and every app deploy re-ships the worker — and it breaks the "one supervised service" shape the architecture names (§11: *"one interface (ours)"*). **Rejected.**
4. **Switch the port's client to the old HTTP API (8642).** A different contract — a new adapter family — and it is the door being retired. **Rejected.**

**The runtime measurement for the `P2-8` build (2026-10-14, rule 0b — the live stack + the pin + the app container):**

| Fact | Evidence |
|---|---|
| **aiohttp is NOT in the worker image (rule-13 correction)** | `docker exec mercato-hermes-gateway python -c "import …"` → `ModuleNotFoundError: No module named 'aiohttp'`. §2.14's options prose named a library the image does not ship. Corrected above and in the three files that repeated it |
| **The pin's own web stack IS in the worker image** | same probe → **uvicorn 0.41.0 · websockets 15.0.1 · starlette 1.3.1 · fastapi 0.133.1**. The pin's reference mounting (`evals/liveness/ws_orphan_reconnect.py:58-72`) is FastAPI + uvicorn run in a **thread** over a **pre-bound socket** — `@app.websocket("/api/ws") async def ws(ws): await handle_ws(ws)` — and that is the pattern this row copies |
| **`handle_ws`'s exact contract** | `async def handle_ws(ws, *, auth_identity=None, subprotocol=None)` (`ws.py:295`): accepts, writes `gateway.ready` (`:365-370`), answers `gateway.ping` inline as `{"jsonrpc":"2.0","result":{"ok":true},"id":…}` (`:420-424`), and dispatches every other RPC through `tui_gateway.server.dispatch` on a pool thread (`:329`) — the SAME `dispatch` the stdio entry runs. One frame = one `serialize_frame` line (`transport.py`: `json.dumps`, so a frame can never contain a raw newline) |
| **The pin's ticket mechanism** | `hermes_cli/dashboard_auth/ws_tickets.py`: `mint_ticket(user_id, provider)` → single-use, `TTL_SECONDS = 30`; `consume_ticket(ticket)` → the `{user_id, provider}` info dict. The dashboard's mint leg is an authenticated `POST /api/auth/ws-ticket` (`dashboard_auth/routes.py:556-564`); the upgrade consumes `?ticket=` (`web_server_chat.py:299-320`). A bad credential closes **pre-accept** with code **4401** (`web_routers/chat_ws.py:140-145`) |
| **The app can dial a WebSocket with NO new dependency** | `docker exec starting-kit-app-1 node -e "typeof globalThis.WebSocket"` → **function** (node **v24.21.0**, undici); the repo pins node 24. So the client needs no npm package — only the seam |
| **The app and the worker share one network** | live: both containers on `mercato-network-local`; `dns.lookup('hermes-gateway')` from the app → **172.18.0.10**. The compose's worker network is `external: true` joining the operator's stack (its own measured comment) — the service-name URL works |
| **The stdio channel stays the worker's own** | `tui_gateway/entry.py:273 main()`: process setup, then a blocking `sys.stdin.readline()` loop; `handle_ws` re-runs the same **idempotent** setup (`ws.py:380-387`), so the ws door mounts in a thread beside it — exactly the desktop product's in-process shape (`hermes_cli/main.py:2680`) |

**The build these measurements dictate (the seam, named before code):**

- **Worker** — `docker/hermes/ws_host.py` (FastAPI app: `GET /healthz`; `POST /internal/ws-ticket` — a shared secret from env, constant-time compared, mints via the pin's `mint_ticket`; `WS /api/ws?ticket=` — the pin's `consume_ticket`, 4401 on a bad ticket, then `handle_ws(ws, auth_identity=…)`) + `docker/hermes/ws_entry.py` (binds the socket, serves uvicorn in a daemon thread, then runs `tui_gateway.entry.main()` in the main thread). Compose CMD → `ws_entry.py`; `HERMES_WS_TOKEN` unset ⇒ **the ws door does not listen** and the stdio channel is unchanged (fail-closed per transport). Image tag `p2-1` → `p2-8` (the Dockerfile copies the two new files).
- **Client seam** — `lib/hermes-gateway-transport.ts`: one `HermesGatewayTransport` interface (`send` / `onLine` / `onClose` / `close`); the stdio transport is extracted from the client (its coverage moves with it); the ws transport dials over the global `WebSocket`, fetches a **fresh ticket per dial**, and retries the dial (1s ×2 → 16s cap, ±25% jitter, 5 attempts, 10s per-attempt socket timeout). The client class keeps its public surface — `connect`/`request`/`on`/`onExit`/`stop` — so `hermes-port-adapter.ts` is untouched.
- **Connect-once lifecycle, documented bound** — one client = one connection = one run: the port is resolved per chat run, so a socket that dies mid-run ends that run (the port's own error event, carrying the close code) and the **next** run dials afresh. A mid-run *resume* (`session.resume`) is deliberately NOT built here: sessions live in the worker, and resuming a different session would silently continue a turn — a correctness hole a later row owns.
- **Config** — `HERMES_GATEWAY_URL` (compose default `http://hermes-gateway:8091`, the sibling service) + `HERMES_WS_TOKEN` (the same shared secret both sides). URL set without token ⇒ a **loud refusal** (never a silent unauthenticated dial); URL unset ⇒ today's stdio client, the transitional path. **`AI_RUNTIME_ENGINE` is unchanged: the default does NOT move in this row.**

**What this row builds — two sub-rows, in order.**

- **`P2-8` — the connection lifecycle (requirement, this section).** A transport the platform can use in production, proven against the **live** worker: (a) a ws host in `docker/hermes/` that mounts the pin's `handle_ws` behind the pin's own ticket auth, listening on `mercato-network-local`; (b) the client's transport becomes a **seam** — the same framing, handshake, id-correlation and event dispatch, driven over ws instead of a spawned child, with the unit suites re-pointed at a **ws** fake; (c) a health gate (`ping` over the new transport) and a documented reconnect policy. **The engine is still selected by env (`AI_RUNTIME_ENGINE`); the default does NOT move here.**
- **`P2-9` — the switchover proper (one change).** The default flips to `hermes` in `lib/resolve-ai-runtime-port.ts`; OpenCode is **deleted** in the same change (`R28-6`/`N-8` — the engine files, its Docker service and `OPENCODE_URL`, the vestige **re-named** separately per `CC-72`'s steps); `hermes-local` is **retired** per `CC-74`'s steps (stop the container, delete the service block + `HERMES_BIND`/`HERMES_PORT`, update `COOKBOOK.md`/`docker/README.md`; the `mercato-hermes-data-local` volume stays until the owner says so — rule 11).

**What this row does NOT claim (named bounds).** It does not widen the port contract; it does not touch the platform's other two runtime routes (a different engine family); **`CC-79`** (the live worker bridge) is unaffected; the flip lands only after `P2-8` proves the connection live.

**Exit gate.** For `P2-8`: with **no hand-spawned process**, a client connects the running worker over the new transport, the handshake and a `ping` health gate pass, and `P2-7`'s harness (minus `docker exec`) serves a real turn through it — command + output; the suites re-pointed at a ws fake; full package green; `tsc` 0 new; mutations RED. For `P2-9`: `AI_RUNTIME_ENGINE` now **defaults to hermes**; `door-only-way-in.test.ts` still passes with the OpenCode engine **gone**; the retired `hermes-local` leaves no reference behind; the same gates.

**The step this row hands forward.** Once the switchover lands, the port's remaining Hermes-shaped items are `CC-79` (the live worker bridge) and the `secretRefs`/`steerRun` bounds — and `N-8`'s remaining rewiring.

### 2.14.1 `P2-8` — DISCHARGE RECORD (2026-10-14)

**Verdict: `P2-8` holds. The platform can now CONNECT the worker — proven live, with no hand-spawned process — and the default did not move.**

**What landed** (code repo `workspace/starting-kit`, branch `main`; docs repo, this change — rule 6/8):

| Layer | File | What it is |
|---|---|---|
| **The door** | `docker/hermes/ws_host.py` (NEW) | A FastAPI app built lazily so the module imports where the pin is not on `sys.path`. Three legs: `GET /healthz`; `POST /internal/ws-ticket` (Bearer shared secret, `secrets.compare_digest`, the pin's `mint_ticket(user_id="companai-runtime", provider="companai")`); `WS /api/ws?ticket=…` (the pin's `consume_ticket`, pre-accept `close(4401)`, then `handle_ws(ws, auth_identity=…)` — the pin's own transport, verbatim) |
| **The process** | `docker/hermes/ws_entry.py` (NEW) | The image CMD. Imports `tui_gateway.entry` and binds the socket **in the main thread** (fail-fast FATAL on a port conflict), serves uvicorn in a **daemon thread**, then runs `stdio_entry.main()` in the **main thread**. Token unset ⇒ the door does not listen and this is the stdio worker it has always been |
| **The image** | `docker/hermes/Dockerfile` | COPYs the two files, `RUN python3 -m py_compile` all four (a syntax error must fail the build — it once FATALed 15s into every boot), CMD → `ws_entry.py`; the falsified "no port to expose" comment rewritten |
| **The client seam** | `packages/ai-assistant/src/modules/ai_assistant/lib/hermes-gateway-transport.ts` (NEW) | `HermesGatewayTransport` (`send`/`onLine`/`onClose`/`close`/`ownsWorkerProcess`) + `createStdioTransport` (extracted from the client, its coverage moved with it) + `createWebSocketTransport`/`fetchHermesTicket` (Bearer header, never a URL; fresh single-use ticket per dial; 401/403 fail-fast; else 1s ×2 → 16s cap, ±25% jitter, 5 attempts, 10s per socket) |
| **The client** | `lib/hermes-gateway-client.ts` | Re-pointed at the seam: `transportFactory?` option, `openTransport()`, onClose → failPending + onExit(code) + teardown, the handshake in try/catch → `failConnect` (a transport the **client** opened is closed; a spawned child stays the caller's), `stop()` sends `process.stop` **only** when `ownsWorkerProcess`. The port adapter is untouched except for the one death-message rewording its own test now names (a ws close code is not a process exit) |
| **The config** | `lib/resolve-ai-runtime-port.ts` | `resolveHermesGatewayConnection` — `null` when unset (today's stdio client, the transitional path), a **loud refusal** on a URL without a token, trailing slash trimmed; `buildHermesClient` picks the ws client when configured, else the stdio client |
| **The wiring** | `docker-compose.hermes.yml` · `docker-compose.fullapp.yml` · `docker/hermes/Dockerfile` | Worker: `HERMES_WS_TOKEN`/`HOST`/`PORT` (token a pass-through with an **empty** default; the door is **never published** to the host). App: `AI_RUNTIME_ENGINE:-opencode` (**the default did NOT move**), `HERMES_GATEWAY_URL:-http://hermes-gateway:8091`, `HERMES_WS_TOKEN` — each guarded by a suite that **parses** the mapping |

**Gates.**

- **Full package green: 128 suites / 1838 tests** under the pinned **Node 24** (**L154**; P2-7's 127/1771 = +1 suite, **+67 tests** — 1836 as first measured, 1838 after the critic's two new guards). The suites are re-pointed at a **ws fake**: the client suite's wire tests run `describe.each(['stdio','ws'])` over a shared `FakeHermesDoor`, so the framing, the handshake, the id-correlation, the exit subscription and the stop policy are proven on **both** transports by the same code paths. `handshake_gate.py`'s image constant moved to `hermes-gateway:p2-8`.
- **`tsc` 92 = the pre-existing `CC-73`, 0 new** (`--incremental false`, **L139**). A first run showed **104** — **12 were new, all in the new transport test**, and were fixed (an event-emitter fake written as an object wrapping `on` instead of the method the contract declares; a cast through `unknown`). jest does not type-check here (**L138**), so the suite was green while `tsc` was not — the gate caught it.
- **18 mutations all RED, md5-restored** (16 as first measured, **+M17/M18** after the critic; harness `apply_mutation.py`, byte-level, a pristine-md5 registry that refuses to mutate a file that is not pristine): secret on the URL · no 401 fail-fast · ws claims the worker process · `stop()` always retires · URL-without-token silent · unset URL not null · the `environment:` gate removed · Dockerfile comments read as instructions · a death leaves requests hanging · a multi-frame message read as one frame · `ports:` published · the worker token dropped · the CMD reverted · `ws_host.py` dropped from `py_compile` · the engine default flipped early · the app URL set to loopback · the EOF yields to the process exit (M17, D1) · the fake upgrade refusal loses its `onerror` leg (M18, N3).

**The live proof (§2.14's exit gate, verbatim).** The worker was recreated from the compose with `HERMES_WS_TOKEN` set and a **loopback-only** port override held **outside both repos** (the committed default publishes nothing — now guarded). Commands and their output:

```
$ docker compose -f docker-compose.hermes.yml -f <proof-override>.yml up -d --no-deps hermes-gateway
[Hermes ws-entry] the ws door is listening on 0.0.0.0:8091 (ticketed; the app connects HERMES_GATEWAY_URL here)
[Hermes ws-entry] starting the stdio gateway channel

$ curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8091/healthz
200
$ curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8091/internal/ws-ticket          # no secret
401
$ curl -s -X POST -H 'Authorization: Bearer <the door token>' http://127.0.0.1:8091/internal/ws-ticket
{"ticket":"s0RweP0Hirt1oGSiBReuckX_qIt5FlBylO6C5gTgPIA","ttl_seconds":30}
```

**The `ping` health gate** (the seam against the live door — mint, upgrade, one RPC, pong):

```
$ P2_7_URL=http://127.0.0.1:8091 P2_7_WS_TOKEN=<token> tsx ping-probe.mts
P2-8 ping health gate — dialing http://127.0.0.1:8091
  dial: OPENED in 81ms (ticket minted fresh, upgrade accepted)
  ping reply: {"jsonrpc":"2.0","id":1,"result":{"pong":true}}
  pong: true — the health gate PASSED
$ P2_7_URL=… P2_7_WS_TOKEN=the-wrong-secret tsx ping-probe.mts
P2-8 ping health gate FAILED: the hermes ws mint leg answered 401
```

**A real turn through it — `P2-7`'s own harness, minus `docker exec`** (`yarn workspace @open-mercato/ai-assistant p2-8:live`, i.e. `scripts/hermes-live-turn.mts` with `P2_7_URL` + `P2_7_WS_TOKEN`):

```
P2-8 live-turn gate (the P2-7 harness over the worker ws door)
  transport: ws door at http://127.0.0.1:8091 (no spawned process)
    evt gateway.ready :: {"skin":{…}}
  handshake: perSessionExclusiveSubmit=true serverRequests=14
  startRun: runId=p2-7-live-1791956793979 runtimeSessionId=09a33a78
    evt tool.start / tool.complete :: tool_search …
    evt session.usage :: {"usage":{"model":"Qwen2.5-7B-Instruct-Q4_K_M","prompt":16725,…
    evt message.complete :: {"text":"Hermes live turn OK. No matches found for the queries, …"
  typed event types: ["tool-call","tool-result","metadata","text", … ,"metadata","done"]
  ANSWER: "Hermes live turn OK. No matches found for the queries, but related tools are available."
  PASS — a real turn answered and ended on done (25 events) in 183.4s
  worker events seen: 41
```

No hand-spawned process: the harness's only transport is the door. The handshake (`client.capabilities` → `gateway.capabilities` → **`ping`→`pong`** → `gateway.ready`) passed, the `ping` health gate passed on its own, and a real turn — the model, the tool call, the usage frame and the final `done` — was served by the **running** worker over the new transport.

**Re-proved on the REBUILT image, after the critic's `N6` fix (2026-10-14).** The critic's fixes touched `ws_host.py` (the secret trim) and the client, so the image was rebuilt (`docker compose … build hermes-gateway` → `Image hermes-gateway:p2-8 Built`) and **every** live leg below was re-run against that one artifact — no leg on this page is carried over from the pre-fix image:

```
$ curl -s -o /dev/null -w '  http %{http_code}\n' http://127.0.0.1:8091/healthz                # leg A
  http 200
$ curl -s -o /dev/null -w '  http %{http_code}\n' -X POST http://127.0.0.1:8091/internal/ws-ticket        # no secret
  http 401
$ curl -s -o /dev/null -w '  http %{http_code}\n' -X POST -H 'Authorization: Bearer <a WRONG secret>' …  # fail fast
  http 401
$ curl -s -X POST -H 'Authorization: Bearer <the door token>' …
{"ticket":"OwJEt-1BUe9MKTF8-UzUBtbA2VbeQbfaWEmHBBsaeCQ","ttl_seconds":30}
$ curl -s -X POST -H 'Authorization: Bearer  <the door token>  ' …      # N6: the padded header, both sides
{"ticket":"5qzrGS9NDnBwBfRGY1z5eVWbdDzG00uXos2_r4Hd9eE","ttl_seconds":30}

$ # leg: a ws TICKET is single use — mint one, upgrade with it, upgrade with it AGAIN
  1st upgrade with this ticket   : ACCEPTED (HTTP 101)
  2nd upgrade with same ticket   : REFUSED (HTTP 403)
  SINGLE USE: PROVEN

$ P2_7_URL=http://127.0.0.1:8091 P2_7_WS_TOKEN=<token> node ping-probe.mts          # the health gate, again
P2-8 ping health gate — dialing http://127.0.0.1:8091
  dial: OPENED in 98ms (ticket minted fresh, upgrade accepted)
  ping reply: {"jsonrpc":"2.0","id":1,"result":{"pong":true}}
  pong: true — the health gate PASSED

$ yarn workspace @open-mercato/ai-assistant p2-8:live                # P2_7_URL + P2_7_WS_TOKEN, no docker exec
P2-8 live-turn gate (the P2-7 harness over the worker ws door)
  transport: ws door at http://127.0.0.1:8091 (no spawned process)
  handshake: perSessionExclusiveSubmit=true serverRequests=14
  startRun: runId=p2-7-live-1791962558438 runtimeSessionId=8c47523f
    evt message.complete :: {"text":"HERMES LIVE TURN OK","usage":{…}}
  typed event types: ["text","text","text","text","text","metadata","metadata","done"]
  ANSWER: "HERMES LIVE TURN OK"
  PASS — a real turn answered and ended on done (8 events) in 41.0s
  worker events seen: 15
```

The first re-proof attempt of the padded header failed **on the shell side**, not the door's: `curl` answered *"no URL specified"* — a quoting/word-splitting failure in my own command line, so no request ever reached the door (the failure proves nothing either way about the trim). Fixed by building the header **as one variable** and passing it as a single `-H "$PAD"` argument — the leg then mints a ticket on the first try, which is what `N6`'s fix is for.

**Two defects found during the build, both fixed in this change.**

1. **The port adapter's death message changed but its test did not.** P2-8 reworded the exit event to *"the hermes worker **connection** ended mid-run"* (a ws close code is not a process exit); `hermes-port-adapter.test.ts` still asserted the old wording and the full gate went red on it. The wording is right for both transports; the test now names **why**.
2. **Two of my own guards were vacuous — found by the mutation gate, not by reading.** The wiring suite's "a key that appears only in a comment does not satisfy the assertion" fixtures passed **with comment-stripping disabled** (measured: a probe that removed `stripComment` from the parser went GREEN). A comment-only key can never be parsed by a mapping reader, so the fixture could not fail. They were rewritten to put the key **both** in a comment and in another section of the same service (`labels:` / `deploy:`), with a real mapping asserted as the control — and the mutant that removes the `environment:` gate now turns them RED (**L156**).

**The hostile critic, and what it found (2026-10-14).** A separate agent audited the delta against §2.14.1 with its own commands and mutants, and found **1 real defect + 5 nits — all fixed in this change:**

- **D1 (real, medium-low) — the extraction changed the stdio death ordering.** The pre-seam client's `on('exit')` was its **only** exit path, so it was order-independent; the seam's first-wins `finish` let stdout **EOF** win whenever the pipe's `end` was dispatched before the child's `exit`, reporting `code null` and losing the worker's exit code from the run's error event (proved with a scratch probe against `git show HEAD:…hermes-gateway-client.ts`: *old `[end-first]` → `exits=[1]`*, new → `exits=[null]`). **Fixed:** an EOF death now yields **one macrotask** to the process exit, so the exit code is never lost, and stands on its own if no exit arrives. Guarded by a new test *and* by mutant **M17**.
- **N2 — `close()` "safe to call twice" was an unproven contract claim** (a mutant making the second call throw stayed GREEN). Fixed with a test (double close → no throw, one close notification).
- **N3 — the ws fake was unfaithful about a refused upgrade.** Real node 24 fires `onerror` **then** `onclose:1006` for an upgrade the door answers with a 403 (measured by the critic); the fake fired only `onclose`, so the suite pinned the message *"the upgrade was refused"*, which production never sees. **Fixed:** the fake fires both, in order, and the assertion now pins the production wording *"the socket failed to open"*. Guarded by mutant **M18**.
- **N4 — `handshake.gatewayReady` was always `null` in ws mode.** The pin writes `gateway.ready` immediately after the accept, before the client's `ping`; the client subscribed only afterwards, so the event was already gone. **Fixed:** the wait is registered **before** the handshake sequence.
- **N6 — the door did not trim its shared secret while the client did**, so a stray newline/trailing space in one service's env would be a silent, permanent 401. **Fixed:** `ws_host.py` strips both sides (the presented Bearer credential was already stripped).
- **N5 — this record's own wording:** the table above says the port adapter is *untouched* while the same section records its reworded message. Corrected to name the change.

**Gates after the fixes:** full package **128 suites / 1838 tests green** (1836 + the two new tests); `tsc` **92 = `CC-73`, 0 new**; **18 mutations all RED**, md5-restored; the door re-proved after the image rebuild (**"Re-proved on the REBUILT image"** above: healthz, both 401 legs, the clean mint, the padded mint, ticket single-use, the `ping` gate and a fresh 41.0s live turn — every leg on the post-fix artifact).

**Named bounds (unchanged, and now tested).** The engine is still selected by env — **`AI_RUNTIME_ENGINE` still defaults to `opencode`, and the sole test that would catch an early flip is green**; a mid-run socket death ends that run and the **next** run dials afresh (connect-once — a mid-run `session.resume` is a named bound, not built); `stop()` on a shared door never retires the worker other clients are using; the door is **not published** to the host.

**Next: `P2-9` — ONE change.** The default-flip to Hermes + the OpenCode deletion (`R28-6`/`N-8`) + the `hermes-local` retirement (`CC-74`), whose trigger was already fully met by `P2-7`. `CC-79` (the live worker bridge) is now the only item between the platform and a Hermes-served chat in production.

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
**Refined 2026-10-13 (rule 13, `P2-5`'s requirement §2.11):** the function is currently **private to
that route**; the row **extracts it to `lib/resolve-ai-runtime-port.ts`** and makes it config-selected
(env `AI_RUNTIME_ENGINE`, default `opencode`) — the *"one place"* claim stays true, and the swap
becomes testable in isolation rather than only assertable. The two `api/ai/*` routes construct their
own adapter and are a **different engine family** — out of this row's scope.

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
tool **through the door**, authorized at execution time under the existing `S-02` gate
(`S-02` — tool-call authorization at execution time, deny-by-default, DONE `3add3a2`).
**Premise corrected 2026-10-13 (rule 13):** the pinned worker's tool surface is its own closed
toolset and the wire exposes no tool-registration surface, so the tool cannot be *offered* to the
worker in this phase — the door is proven through the port's own API and the live bridge (a worker
plugin calling the authenticated tool door as the acting principal) is registered as `CC-79`.

---

## 4. The sub-rows — each with its own exit gate

A phase is not done because code exists; it is done when the gate is measured. The order is the
foundation order from §2.1.

| Sub-row | What lands | Exit gate |
|---|---|---|
| **P2-1** | **The worker boots.** `docker/hermes/` (image + entrypoint) and a compose service, mirroring `docker/opencode/`: pinned source mounted, `uv`-locked deps, the TUI gateway started on stdio, health from `ping`, config from `OM_AI_*` | ✅ **DISCHARGED 2026-10-12** — §2.7 holds the full record. Gate `docker/hermes/handshake_gate.py`: `client.capabilities` (all **14** `server_requests`), `gateway.capabilities` (`per_session_exclusive_submit: true`), `ping` → `{'pong': true}`, `gateway.ready` → `[change_events, replay_epoch, skin]`, `process.stop` — **GATE PASSED in 39.5 s**, no stub or mock, image built from the pin's own lock in 1m49 s. **RED:** the same gate against `hermes-agent-main-older` refused with `PIN BROKEN … 3e3b81f2… files 17367`, 0 stdout frames — cross-validating the container verifier against the host harness. Compose cold start re-proved the boot (`PIN HOLDS`, 18,248 files) on `mercato-network-local`, and `down` left the whole platform stack intact. **One premise corrected after the fact (rule 13):** the network is external + overridable — the first version copied `docker-compose.yml`'s hardcoded `mercato-network`, which the running stack does not use. |
| **P2-2** | **The gateway client.** `lib/hermes-gateway-client.ts`: spawn/supervise the worker, newline-JSON framing both ways, typed request/response correlation, the handshake, `prompt.submit` + the event stream, `session.interrupt`/`steer`, `process.stop` | ✅ **DISCHARGED 2026-10-12** (commit `f5f85064`). Against a **protocol stub implementing the measured contract** (§3.1/§3.2), all four behaviours proven: handshake (with the snake_case wire keys), one streamed turn as ordered typed events, cancel, and **a malformed frame does not kill the stream**. **21/21 tests.** Hostile-critic-hardened: a separate agent found 3 real defects (every event is an `event`-enveloped frame, so nothing dispatched; a pino-style logger call on a message-first logger; an unguarded `stdin.write`), each verified against the pinned source and fixed — and the critic's finding invalidated part of the suite, whose frames were the *un-enveloped* shape the real server never writes. **RED-then-GREEN:** mutating the envelope unwrapping turns **8 of 21 RED**; restored md5-identical (`4416a886…`) → 21 GREEN. **`tsc` clean — honestly qualified:** `P2-2`'s own two files are error-free, but the package's type gate **did not exist** (`tsc -p .` = TS18003; it was the only one of 21 configs not extending `tsconfig.base.json`). Fixing that surfaced **92 pre-existing errors in 27 other `__tests__` files**, scheduled as **`CC-73`** with the native-compiler and stale-`tsbuildinfo` measurements recorded as **L138/L139**. Any `tsc` run on this package must pass `--incremental false` to be reproducible. |
| **P2-3** | **The port adapter.** `lib/hermes-port-adapter.ts` implementing `AiRuntimePort`, with an **honest** capability map — measured against the client, ✗ where it is ✗ (no pretending; the OpenCode adapter's own standard) | ✅ **DISCHARGED 2026-10-12** — §2.9 holds the full record. **37/37 tests GREEN** (the event map, both usage scopes, the envelope's own deadline, idempotent start/cancel, replay-safe complete, the steer verdict's three limits, identifier distinctness); the **full package is 120 suites / 1665 tests GREEN**; `tsc` shows **0** errors in the new files against the 92 pre-existing (CC-73). The capability map is the honest one: **seven ✓, `resolveToolCall` ✗ (`P2-4`), `steerRun` ✓** — the first engine that makes the port's eight real. **Hostile critic (separate agent) found 3 defects, each verified against the pinned source before the fix:** `resumeConversation` kept the caller's stored id while the gateway resolves a turn by the **runtime** id only (the `D2` correctness defect — invisible to the original fake, which echoed the request); the unsubscribe proof was **vacuous** (it counted submits, which no emission changes); the `onExit` subscription was never released. All three fixed in the same change, and the critic's own "no deadline policy" aside was **falsified by measurement** (the envelope carries `deadline`; the adapter now honours it — the OpenCode half registered as `CC-76`, L146). **RED-then-GREEN:** **11 mutations, all RED**, restored md5-identical (`706ad202…`). **The one remaining named bound:** a steered instruction reaches the worker's own tools only (§2.8's third limit). |
| **P2-4** | **The one narrow tool — the two-gate design (requirement §2.10).** The runner agent declared as a module built-in with a FIXED menu (`business_ir.run_query` — the tools it needs all the time); the effective menu recorded on the run at admission through the EXISTING machinery (agent's declared list ∩ binding ∩ permissions); the Hermes door's `resolveToolCall` enforcing TWO gates — the call's tool must be in the run's recorded menu, AND the grant must be the run's own — before execution reaches the platform's existing tool door under `S-02` | ✅ **DISCHARGED 2026-10-13** — §2.10 holds the full record. **94 GREEN** across the four Hermes/gate suites; the **full package is 122 suites / 1701 tests GREEN**; `tsc` **92 = the pre-existing count (`CC-73`), 0 in the new/changed files**. The honest map flips: **`resolveToolCall ✓`** — the port's eight operations are all real, for the first engine. **Hostile critic (separate agent) found 2 defects, both fixed:** the admission stored the execution **context by reference**, so a caller-side mutation after admission could **widen authority** (`isSuperAdmin:true` — a §8 violation; fixed by snapshotting the context field-by-field, regression test added, **L147**); and every test injected an executor, leaving the **default** seam (real `executeTool` under a fresh container) unproven — closed with a no-executor test. **My own catch:** the result-channel sink was opened *before* `streamRun`'s guards (a dead sink on a failed stream — **L147**). **RED-then-GREEN:** **10 mutations, all RED**, restored md5-identical. **Named bounds (registered the same change):** the features check stays at admission (the envelope carries no features); the grant is still a **label** (`CC-77`); the task-shaped starting menu is destination (`CC-78` — the door enforces whatever admission records); the live worker bridge (the worker's closed toolset cannot be offered a platform tool on the wire) is `CC-79`. |
| **P2-5** ✅ **DONE 2026-10-13** (§2.11 discharge record) | **Selection at the door (requirement §2.11, measured 2026-10-13).** `resolveAiRuntimePort` becomes config-selected (env `AI_RUNTIME_ENGINE`, default `opencode`) and is **extracted to `lib/resolve-ai-runtime-port.ts`** so the one-function swap is *testable*; the `hermes` branch builds a **real** `HermesGatewayClient` + adapter (production has never constructed one); the chosen implementation is recorded on the run (`provenance.implementation`, **envelope not widened**). **The default-flip step is owned here** (§2.11 item 5) | Swapping engines touches exactly one function (proved by a test that flips the env var and asserts `describeCapabilities().implementation` changes); **`door-only-way-in.test.ts` still passes** (the door is still the only way in); OpenCode is untouched and still answers; the platform-runtime routes are **not** unified (different engine family). **Named bounds:** the default does **not** move in this row (it moves when `P2-6` is green); `CC-76` (OpenCode ignores `deadline`) is a co-requisite of the **deletion**; `CC-74` fires at `P2-6` |
| **P2-6** ✅ **DONE 2026-10-13** (§2.12 discharge record) | **The exit gate proof (requirement §2.12, measured 2026-10-13)** — cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access, on one tenant then on two adversarial ones. **Builds the missing bound:** `lib/ai-runtime-bounds.ts` (NEW, shared by the engines) and **`CC-76` FIXED** (OpenCode now honours the envelope's time bound) | All five measured on one tenant; then the two adversarial tenants: a run admitted for tenant A cannot read, name or affect tenant B — proven by a negative test that fails if any cross-scope frame exists. **Gates:** full package **125 suites / 1752 green**; `tsc` **92 = the pre-existing `CC-73`, 0 new**; **10 mutations all RED** md5-restored. **Critic: 2 defects + 2 nits, all fixed** (D1 the bound must **END** the stream, not just flag it — **L151**; D2 the **third** `AiRuntimePort` implementation was unbounded — **L152**). **The default did NOT move** — this row proves; it does not flip. **⚠ CORRECTION (rule 13):** §2.12 scoped the gate to *the five properties through the port*; §2.11's **stated** gate also required **a live turn over Hermes**, which §2.12 did not write and this row did **not** build (the proof used a `FakeClient`). The missing half is **§2.13 (`P2-7`)** — and the flip is **gated** on it |
| **P2-7** ✅ **DONE 2026-10-14** (§2.13 discharge record) | **Hermes serves a LIVE TURN (requirement §2.13, measured 2026-10-13/14)** — connect the pinned worker, `session.create`, `prompt.submit`, and read the adapter's ordered typed events: a **real** model answer, not a fake. Plus: the worker's model config settled and **forwarded** so it reaches a reachable (local) model | ✅ **DISCHARGED 2026-10-14** — §2.13 holds the record with the commands and their output. **Two live turns driven through the pinned worker**, the second **production-shaped** (no injected env — the compose change alone serves it): the worker reached the **local** model through `OPENAI_BASE_URL`, asked for `HERMES_MODEL`, and answered the gate's own prompt; the adapter's ordered typed events ended on a real `done`. **The worker's model wiring is now GUARDED** — a suite that parses the compose's `environment:` mapping (a key that appears only in a comment does not satisfy it), and the harness's judgement is a pure, unit-tested function so a mutation blinds it in milliseconds instead of after a 27-minute live run. **Gates:** full package **127 suites / 1771 tests green** (= 1752 + 19) under the pinned **Node 24** (**L154**); `tsc` **92 = the pre-existing `CC-73`, 0 new**; **7 mutations RED**, md5-restored. **Gated on this: the switchover** (connection lifecycle + default-flip + OpenCode deletion `R28-6`/`N-8` + `CC-74` retirement) — the gate is now OPEN |
| **P2-8** ✅ **DONE 2026-10-14** (§2.14.1 discharge record) | **The production CONNECTION LIFECYCLE (requirement §2.14, measured 2026-10-14).** The worker serves the pin's own **ws transport** — *identical wire protocol* (`tui_gateway/ws.py` reuses `dispatch` verbatim) — via a small **FastAPI/uvicorn** host in `docker/hermes/` (rule-13 correction of "aiohttp") that mounts `handle_ws` behind the pin's ticket auth, listening on `mercato-network-local`; the client's transport becomes a **seam** driven over ws instead of a spawned child; a `ping` health gate + a documented reconnect policy. Engine still selected by env (`AI_RUNTIME_ENGINE`) — **the default does NOT move here** | ✅ **DISCHARGED 2026-10-14** — §2.14.1 holds the record with the commands and their output. **The door is mounted and the client connects it, live:** `healthz` 200, mint 401-without-secret / a single-use 30s ticket with it, `ping`→`{"pong":true}` over a fresh dial, a **real turn** (`tool_search`, the usage frame, a real model answer, a typed `done`) in **183.4s** through `P2-7`'s own harness **minus `docker exec`** — **no hand-spawned process**. **The suites are re-pointed at a ws fake:** the client suite's wire tests run `describe.each(['stdio','ws'])` over a shared `FakeHermesDoor` (+ a 23-test seam suite and a resolver suite), so both transports are proven by the same code. **Gates:** full package **128 suites / 1836 tests green** under the pinned **Node 24** (**L154**); `tsc` **92 = `CC-73`, 0 new** (a first run showed 104 — 12 new in the new test, all fixed); **16 mutations all RED** md5-restored. **Two defects found in the build, both fixed:** the port adapter's death message changed and its test did not; and **two of this row's own guards were VACUOUS** — the mutation gate proved it (a probe with comment-stripping disabled went GREEN), and the fixtures were rewritten to be catchable (**L156**). **The default did NOT move** — the sole test that would catch an early flip is green |
| **P2-9** | **The switchover proper — ONE change.** The default flips to `hermes` in `lib/resolve-ai-runtime-port.ts`; OpenCode is **deleted** in the same change (`R28-6`/`N-8` — engine files, Docker service, `OPENCODE_URL`; the vestige re-named **separately** per `CC-72`); `hermes-local` is **retired** per `CC-74`'s steps (the `mercato-hermes-data-local` volume stays until the owner says so — rule 11) | `AI_RUNTIME_ENGINE` now **defaults to hermes**; `door-only-way-in.test.ts` still passes with the OpenCode engine **gone**; the retired door leaves **no** reference behind; full package green; `tsc` 0 new; mutations RED |

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
