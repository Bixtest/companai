# PLAN — Hermes §9 **Phase 2: one tenant, one tool**

**Status: WRITTEN FIRST, per the working protocol** — *"Requirement = task definition + those points,
written BEFORE any code."* No Phase 2 code exists yet. This document is the requirement; the builds
below are executed against it, one sub-row at a time, under the full protocol (hostile critic,
RED-then-GREEN, two-route).

**Progress: `P2-1` ✅ (2026-10-12, §2.7) · `P2-2` ✅ (2026-10-12, §4) · `P2-3` ✅ (2026-10-12, §2.9) · `P2-4` ✅ (2026-10-13, §2.10) · `P2-5` ✅ (2026-10-13, §2.11) · `P2-6` ✅ (2026-10-13, §2.12) — **PHASE 2's EXIT GATE IS GREEN**. NEXT = the step `P2-5`/`P2-6` jointly own: **flip the default to Hermes and delete OpenCode** (`R28-6`/`N-8`, with **`CC-76` now fixed**), which is also the **`CC-74`** trigger that retires `hermes-local`**
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
- **`CC-74` fires at `P2-6`, not here.** The upstream `hermes-local` HTTP gateway is retired when this row is discharged **and** a real chat run has been served by the pinned worker — the trigger already written into `CC-74` and the compose service comment.
- **`CC-77` unchanged** — the grant is still a label; nothing in this row resolves it.

**Exit gate.** (1) The selector is config-selected and the swap is **one function** — proven by a test that flips the env var and asserts the constructed port's `describeCapabilities().implementation` changes, with **no other file touched**. (2) `opencode` remains the default: with no env var set, the chat route builds the OpenCode adapter exactly as today. (3) The `hermes` branch builds a **real** client + adapter (no stub) and the run's provenance records `hermes`. (4) `door-only-way-in.test.ts` still passes — the door is still the only way in. (5) Nothing pre-existing breaks (full package suite); `tsc` **0 in the new files** against the 92 pre-existing (`CC-73`); mutations RED (md5-restored).

**The step this row hands forward (named so it cannot be forgotten).** When `P2-6`'s proof is green → **flip the default to Hermes and delete OpenCode in the same change** (`R28-6` / `N-8`), with **`CC-76` fixed first**. Cross-referenced in `COMPLETION-CALLBACKS.md` against `CC-72` (`R28-6`) and `CC-74` so the step is discoverable in the register, not only here.

**DISCHARGE RECORD (2026-10-13).** Built, measured, and critic-hardened in one change. **The default did NOT move** — this row makes the swap *possible*, not *done*; OpenCode is untouched and still answers every chat.

- **What landed.** `lib/resolve-ai-runtime-port.ts` (NEW) — the ONE config-selected construction site for the chat engine. It exports `resolveAiRuntimeEngine(env)` (env `AI_RUNTIME_ENGINE`, default `opencode`; **deny-by-default** — an unknown name throws, and a **set-but-blank** value is refused rather than silently falling back), `resolveAiRuntimePort({ em, auth, env?, engine?, hermesClient? })` returning `{ port, implementation }`, and `resolveHermesWorkerLaunch(env)` (the worker's argv, mirroring the compose service; a **JSON-array** form so an argument containing a space — a Windows path — is expressible). The route's private `resolveAiRuntimePort` was **deleted**; `api/chat/route.ts` now imports `{ resolveAiRuntimePort }` from the new module and takes `textInputRef` (a pure helper, never a factory) from the OpenCode adapter. The chosen engine is recorded on the run: `AiRuntimeRunResult.provenance.implementation` (an optional, engine-agnostic field — **the envelope is NOT widened**, §4.2), set by **both** adapters' `completeRun` on the first completion so a replay cannot rewrite it, and `mintChatRunId(conversationId, startedAt, implementation)` now takes the engine as a **required third argument** (so a Hermes run cannot be mislabelled `opencode`).
- **Numbers.** The new `resolve-ai-runtime-port` suite (15 tests) plus the four updated suites are **124 tests GREEN across 6 suites**; the **full package is 123 suites / 1723 tests GREEN**; `tsc` is **92 errors — exactly the pre-existing count (`CC-73`), zero in the new or changed files**.
- **Hostile critic (separate agent) — 2 real defects found, both fixed in the same change.** **C5 (serious):** the requirement asserted the run's ledger entry "must say WHICH engine" and added `provenance.implementation`, but **no adapter read `result.provenance`** — the field was accepted and **dropped**. Fixed symmetrically in **both** adapters: each run record gained `implementation?: string` and each `completeRun` records `result.provenance?.implementation`, with a test on each half. **C3 (partial):** a **set-but-blank** env value (`''` / whitespace) silently selected `opencode`, so an operator who meant Hermes would believe Hermes was serving — now **refused** ("is set but empty — refusing to guess …"), making the requirement's "deny-by-default" wording literally true. Two **WEAK tests** the critic flagged were also fixed: the route's "constructs no adapter" check was a substring scan (now pins the **exact symbol list** of its `opencode-port-adapter` import — `toEqual(['textInputRef'])`), and the selector's "names no engine" check matched only `from '…'` (now covers `from` / `require` / `import()`).
- **RED-then-GREEN — and the proof itself had to be repaired before it could be trusted (L149/L150).** The first harness reported "13/13 RED" in **1 second**, which is impossible for 13 jest suites: a node harness that spawns jest via `execFileSync`/`spawnSync` throws **`EBUSY`** on Windows in this sandbox, so **every** mutation was reported RED **without jest ever running** — a false positive. The harness was rebuilt as a **bash** loop that spawns jest directly, and it now proves a **GREEN baseline for every targeted suite BEFORE trusting any RED**, and requires jest's own `Tests:` line (a jest that fails to *start* is an ERROR, never a RED). Two defects surfaced in the same pass: (a) the new suite called the **real** `handleOpenCodeHealth` (a live HTTP probe + DI container), so it hung to the jest timeout whenever Docker was down — a unit test depending on a live service; fixed by mocking `../opencode-handlers`, as the adapter's own suite does. With the repaired harness: **5 baselines GREEN, then 13 mutations all RED**, restored md5-identical (`resolve-ai-runtime-port.ts` `313a0d11…` · `route.ts` `6c899669…` · `ai-runtime-port.ts` `c1069f28…` · `opencode-port-adapter.ts` `bae649f7…` · `hermes-port-adapter.ts` `46196ab7…`). Each mutation removes exactly one thing: the default · the set-but-blank refusal · the unknown-name refusal · the implementation name · the env read · the run-id engine · the recorded provenance · each adapter's recording · the no-factory import · the required third argument · the JSON argv · the worker-command default.
- **Named bounds (unchanged, each registered in the same change):** the platform-runtime routes (`api/ai/chat`, `api/ai/run-object`) are a **different engine family** and are NOT unified here; the default does not move until `P2-6` is green; `CC-76` (OpenCode ignores the envelope `deadline`) is a co-requisite of the **deletion**, not of this row; `CC-74` fires at `P2-6` (a real chat run must be served by the pinned worker first); `CC-77` unchanged (the grant is still a label).

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
| **P2-6** ✅ **DONE 2026-10-13** (§2.12 discharge record) | **The exit gate proof (requirement §2.12, measured 2026-10-13)** — cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access, on one tenant then on two adversarial ones. **Builds the missing bound:** `lib/ai-runtime-bounds.ts` (NEW, shared by the engines) and **`CC-76` FIXED** (OpenCode now honours the envelope's time bound) | All five measured on one tenant; then the two adversarial tenants: a run admitted for tenant A cannot read, name or affect tenant B — proven by a negative test that fails if any cross-scope frame exists. **Gates:** full package **125 suites / 1752 green**; `tsc` **92 = the pre-existing `CC-73`, 0 new**; **10 mutations all RED** md5-restored. **Critic: 2 defects + 2 nits, all fixed** (D1 the bound must **END** the stream, not just flag it — **L151**; D2 the **third** `AiRuntimePort` implementation was unbounded — **L152**). **The default did NOT move** — this row proves; it does not flip |

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
