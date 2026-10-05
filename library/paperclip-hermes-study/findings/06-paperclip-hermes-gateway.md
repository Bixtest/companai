# 06 — Paperclip ↔ Hermes: the native gateway and the runner contract

**Batch 06 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch reads upstream Paperclip (`C:\Users\Ramzi\Downloads\companai\library\ai\paperclip-master\`). It asks how Paperclip integrates Hermes, what its "runner" and "runner API" are, how the adapter model lets a control plane call an agent runtime generically, how context goes in and results come back, how MCP access is governed, and what our own platform should copy or avoid. Every claim cites the file it came from. Where a document and the code disagree, the code is trusted and the disagreement is named.

A note on vocabulary first, because Paperclip overloads the word "runner". In this codebase **"runner" means the native Paperclip Runner** — a Rust supervisor (`paperclip-runnerd`) plus the Paperclip Runner Protocol (PRP), exposed to agents as the `paperclip_runner` adapter type (`packages/paperclip-runner/README.md`). **"Runner API tools"** is a separate thing: two model-facing escape-hatch tools (`search_api`, `call_api`) that the native runner advertises so an agent can reach any Paperclip REST operation that has no dedicated tool (`doc/runner-api-tools.md`). Neither of these is the Hermes gateway. They are covered in sections 2 and 4.

---

## 1. How Paperclip integrates Hermes

### 1.1 Paperclip ships adapters; Hermes ships the gateway

Paperclip ships two built-in Hermes **adapter type keys**, `hermes_local` and `hermes_gateway` (`server/src/adapters/builtin-adapter-types.ts:13-14`). Both are registered as built-ins at server start (`server/src/adapters/registry.ts:801-809, 875-896`). The "Hermes gateway" itself is not Paperclip software: it is Hermes's own API server, started outside Paperclip with `hermes gateway run` (`doc/HERMES_GATEWAY_ONBOARDING.md:40-54`). Paperclip ships the *adapter that calls it*.

The two adapters differ only in transport and lifecycle:

| Adapter | Transport | Who starts Hermes | Where the runtime lives |
| --- | --- | --- | --- |
| `hermes_local` | Spawns the local `hermes` CLI as a child process (`packages/adapters/hermes/src/server/execute.ts:557`) | Paperclip, per heartbeat | Same host as Paperclip |
| `hermes_gateway` | HTTP + SSE to an already-running Hermes API server (`packages/adapters/hermes/src/gateway/server/execute.ts:861-967`) | The operator, in advance | Anywhere Paperclip can reach |

Both type keys are owned by one package, `@paperclipai/hermes-paperclip-adapter` (`packages/adapters/hermes/README.md:7-16`). The older `@paperclipai/adapter-hermes-gateway` package is a deprecated compatibility shim that re-exports the gateway entrypoints for one release (`packages/adapters/hermes-gateway/README.md:3-25`).

### 1.2 The boundary between the two systems

The boundary is deliberately thin. For gateway mode, Paperclip is a **client** that issues exactly four calls, all confirmed in code:

- `POST /v1/runs` to create a run, with body `{ input, instructions, session_id? }` (`packages/adapters/hermes/src/gateway/server/execute.ts:324-341, 884-888`).
- `GET /v1/runs/{run_id}/events` for the SSE event stream (`.../execute.ts:571`).
- `GET /v1/runs/{run_id}` for status polling as a fallback (`.../execute.ts:539`).
- `POST /v1/runs/{run_id}/stop` to stop a run (`.../execute.ts:720`).

The E2E smoke verifies `/health`, `/v1/capabilities`, `/v1/runs`, SSE, and stop (`doc/HERMES_GATEWAY_ONBOARDING.md:155-156`). Hermes owns model access, tools, memory, sessions, and skills; Paperclip owns the run, the prompt, the credentials, and the result envelope. Paperclip never imports Hermes code and Hermes never imports Paperclip code — the two talk only over HTTP.

The reverse direction is a separate mechanism, not the adapter: a bundled Hermes skill `paperclip-task-bridge` lets a Hermes-originated request create/comment/update Paperclip tasks using a scoped `task_bridge` API key (`packages/adapters/hermes/skills/paperclip-task-bridge/SKILL.md:6-43`). The onboarding doc is explicit that this must not be confused with Paperclip waking Hermes (`server/src/adapters/hermes-gateway-doc.ts:12-17`).

### 1.3 Credentials are three distinct keys

The onboarding doc names three credentials that must not be reused for each other (`doc/HERMES_GATEWAY_ONBOARDING.md:23-38`):

| Credential | Owner | Direction it authenticates |
| --- | --- | --- |
| Hermes inference provider key (e.g. `OPENROUTER_API_KEY`) | Hermes | Hermes → model provider |
| Hermes gateway key (`API_SERVER_KEY`) | Hermes | Paperclip → Hermes (`Authorization: Bearer …`, `execute.ts:256-263`) |
| Paperclip agent key (claimed once after approval) | Paperclip | Hermes → Paperclip (`PAPERCLIP_API_KEY`) |

The gateway adapter reads the gateway key from `ctx.config.apiKey` or `ctx.config.token` and refuses to start without it (`packages/adapters/hermes/src/gateway/server/execute.ts:815-824`). The config-schema hint states plainly it is "Hermes API_SERVER_KEY, not PAPERCLIP_API_KEY" (`.../config-schema.ts:20`).

### 1.4 Onboarding is a join/approve/claim flow

A Hermes gateway joins as an external agent. The agent submits a join request with `requestType: "agent"`, `adapterType: "hermes_gateway"`, and an `agentDefaultsPayload` carrying `apiBaseUrl`, `apiKey`, and `paperclipApiUrl` (`doc/HERMES_GATEWAY_ONBOARDING.md:87-103`). The server validates and normalises that payload — requiring a plain object, a valid http/https `apiBaseUrl`, and an `apiKey`, and mapping the default dashboard root or `/chat` URL on port 9119 to `/api` (`server/src/routes/access.ts:744-838`). The board approves; Hermes claims a one-time agent key with `join claim-key` (`doc/HERMES_GATEWAY_ONBOARDING.md:114-137`). Only then can an issue be assigned and the agent woken through the normal heartbeat path.

A security default worth copying: remote plain-HTTP gateway URLs are denied unless the join payload sets `dangerouslyAllowInsecureRemoteHttp: true`; loopback HTTP is always allowed (`doc/HERMES_GATEWAY_ONBOARDING.md:56-60`; `packages/adapters/hermes/src/gateway/server/transport-security.ts:23-35`). The smoke scripts expose the same escape hatch as `HERMES_GATEWAY_ALLOW_INSECURE_HTTP=1` (`doc/HERMES_GATEWAY_SMOKE.md:73-75`).

---

## 2. The runner and the runner API

### 2.1 The native Paperclip Runner

The native runner is a standalone package, `packages/paperclip-runner/`, that "is the standalone development boundary for Paperclip's native runner protocol, process supervision, durable transport, provider drivers, and normalized session backends" (`packages/paperclip-runner/README.md:3-5`). Rust owns the production runner under `runner/`; TypeScript is the control-plane reference and conformance oracle (`README.md:5-7`). It is registered as the built-in `paperclip_runner` adapter (`server/src/adapters/registry.ts:362-682`).

What a runner does, in the package's own words (`packages/paperclip-runner/docs/architecture.md:41-47`):

- Opens a run through the narrow `ControlPlanePort` surface.
- Appends ordered events.
- Submits a terminal structured result.
- Owns a local harness session (`HarnessDriver`) and normalises sessions for the control plane (`NativeSessionBackend`).

The protocol is **PRP** (Paperclip Runner Protocol), currently v1 and v2. The JSON Schemas under `protocol/schemas/` are the language-neutral source of truth; a consumer fails closed on an unsupported required version, and peers negotiate the highest mutually supported version (`packages/paperclip-runner/protocol/README.md:1-19`). PRP v2 adds a durable session-goal lifecycle with commands `session.goal.get/set/clear` and matching events (`protocol/README.md:24-48`).

The runner is deliberately isolated: the package must not import `server/`, `ui/`, `cli/`, `@paperclipai/db`, or `@paperclipai/shared` except where a boundary review allows a public contract (`docs/architecture.md:99-108`). The production binding lives in `server/src/services/native-runtime/paperclip-control-plane-port.ts` and depends on the public port, never the reverse (`docs/architecture.md:20-25`).

### 2.2 The Runner API tools (the escape hatch)

`search_api` and `call_api` "extend the native runner when an available dedicated operation cannot express the requested work" (`doc/runner-api-tools.md:3`). Two properties matter for a control-plane designer:

- **Only two tool definitions are advertised**, and the API catalog is returned on demand, never injected into the initial prompt (`doc/runner-api-tools.md:5-7`). The descriptors confirm both are `placement: "optional"`, `exposure: "optional"`, with required claims `api:discover` and `api:call` respectively (`packages/paperclip-runner/src/protocol-actions/search-api.ts:4-28`; `.../call-api.ts:4-28`).
- **It is on by default.** `disabledByDefault: false` in both descriptors; no environment variable is required (`search-api.ts:22`; `call-api.ts:22`). Operators disable it with `PAPERCLIP_RUNNER_API_TOOLS_ENABLED=false` or restrict it to a company allowlist via `PAPERCLIP_RUNNER_API_TOOLS_COMPANY_IDS`; an unset list allows every company and an explicitly empty list allows none (`doc/runner-api-tools.md:9-26`).

`search_api` takes `{query, limit, cursor}` and returns deterministic lexical ranking over OpenAPI paths, summaries, and the old skill reference, with resolved request schemas and relevant dedicated tools; `limit` defaults to 5 and caps at 10 (`doc/runner-api-tools.md:30-42`; `search-api.ts:65-88`). `call_api` takes `{operationId, pathParams, query, body, contentType, responseText, files}`; `companyId` is filled from the active binding, no arbitrary URL/headers/auth can be supplied, and the request still goes through the real HTTP router with its authorization and validation (`doc/runner-api-tools.md:43-52`; `call-api.ts:65-147`).

The resource bounds are stated precisely and are worth reading as a contract (`doc/runner-api-tools.md:54-146`): 16 KiB URL limit, 10 MiB request/upload limit, **1 GiB** limit on new response captures, a durable **4 GiB per-run** capture budget, a **20 GiB company-wide** quota, 30-second connection/stall timeouts, a 10-minute capture deadline, and concurrency caps of two large captures per company and four per server process. A mutation may already have committed when its response is oversized or interrupted, so the doc instructs inspection rather than retry (`runner-api-tools.md:60, 152-156`).

Authority is re-checked at every layer: the server revalidates the active run, task, and actor, mints a server-held agent JWT bound to company and run, and records a `runner.api_called` receipt (`doc/runner-api-tools.md:158-166`). Runner-owned lifecycle actions (checkout, completion, status transitions, approval decisions, execution control) cannot be bypassed through generic calls (`runner-api-tools.md:167-179`). Mutations reserve a durable receipt before dispatch and cap at 512 per run; a reused call ID with different arguments is rejected (`runner-api-tools.md:180-185`).

### 2.3 The native runner's semantic tool catalog

The runner advertises a much larger set of *dedicated* tools than the two escape-hatch tools. The canonical catalog is `packages/paperclip-runner/src/catalog/semantic-action-catalog.ts`. Each action carries `placement` (`always` or `optional`), an effect (`read`/`write`/`governance`), required claims, and allowed work modes (`semantic-action-catalog.ts:81-111`). The catalog includes, among others:

| Group | Operations |
| --- | --- |
| Always-available task tools | `get_task_context`, `get_task_history`, `list_documents`, `read_document`, `list_document_revisions`, `report_progress`, `answer_status_question`, `request_human_input`, `finish_task`, `block_task`, `request_review` (`semantic-action-catalog.ts:126-328`) |
| Optional work tools | `set_task_title`, `write_document`, `register_deliverable`, `control_workspace_service`, `set_dependencies`, `reassign_task`, `create_task`, `create_project`, `schedule_wake` (`...:165-613`) |
| Discovery / governance | `list_agents`, `get_agent`, `search_tasks`, `list_projects`, `list_project_repositories`, `list_approvals`, `get_approval`, `get_approval_context`, `request_approval`, `decide_approval`, `comment_on_approval` (`...:329-584`) |
| Escape hatch | `search_api`, `call_api` (`...:115-125`) |
| Hiring | `hire_agent` (`...:336-359`) |

Skills are created through two more tools, `create_skill` and `update_skill`, available only in Auto and skill-test work (not Ask or pre-acceptance Plan), with an idempotency key and optimistic version checks (`doc/runner-created-skills.md:1-34`).

The catalog is **declarations, not permissions**: "Consumers must not treat membership as permission to expose or invoke an action" (`semantic-action-catalog.ts:622-625`). Exposure and invocation are separately evaluated by the authorization engine (see section 5.6).

### 2.4 The MCP server package is a different role

`packages/mcp-server/` is not the runner. It is "a thin MCP wrapper over the existing Paperclip REST API" that "does not talk to the database directly and does not reimplement business logic" (`packages/mcp-server/README.md:1-7`). It exposes Paperclip *as* an MCP endpoint (read tools like `paperclipMe`, `paperclipListIssues`; write tools like `paperclipCreateIssue`, `paperclipAddComment`; and an `paperclipApiRequest` escape hatch limited to `/api` and JSON bodies) (`packages/mcp-server/README.md:33-91`; `packages/mcp-server/src/tools.ts:270-690`). This is "endpoint mode", distinct from Paperclip's MCP "gateway mode" (section 5).

---

## 3. The adapter model

### 3.1 The contract

An adapter is a module implementing `ServerAdapterModule`. The one required behaviour is `execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>` (`packages/adapter-utils/src/types.ts:462-464`). Everything else is optional and capability-flagged: `testEnvironment`, `listSkills`/`syncSkills`, `sessionCodec`, `models`/`listModels`/`refreshModels`, `getConfigSchema`, `getRuntimeCommandSpec`, `loginCapability`, `onHireApproved`, and more (`types.ts:462-556`).

The heartbeat is the driver. "When a heartbeat fires, Paperclip: 1. looks up the agent's `adapterType` and `adapterConfig`; 2. calls the adapter's `execute()` function with the execution context; 3. the adapter spawns or calls the agent runtime; 4. the adapter captures stdout, parses usage/cost data, and returns a structured result" (`docs/adapters/overview.md:10-16`). Agents do not run continuously; they run in short heartbeat windows triggered by timer, assignment, on-demand, or automation (`docs/agents-runtime.md:9-29`).

### 3.2 Three registries, one package shape

An adapter package is consumed by three registries: the **server** registry (execution), the **UI** registry (transcript rendering and config forms), and the **CLI** registry (terminal output for `paperclipai run --watch`) (`docs/adapters/overview.md:93-114`). Built-in adapters are registered from static imports; external adapters are loaded at startup via the plugin system (`docs/adapters/overview.md:12-16`).

The server registry is mutable and supports override-with-restore: `registerServerAdapter`, `unregisterServerAdapter`, `requireServerAdapter` were added so an external package can shadow a built-in while it is enabled, and the original built-in is kept in `builtinFallbacks` and restored when the override is paused or removed (`server/src/adapters/registry.ts:864-1008`). External modules are merged with host-provided session management so an external that overrides a built-in inherits the built-in's policy (`registry.ts:931-941`).

### 3.3 How a control plane calls a runtime generically

The generic seam is `execute(ctx)`. Everything runtime-specific is pushed into `ctx.config` and `ctx.context` (plain records), and everything the runtime returns is squeezed into the single `AdapterExecutionResult` shape. That is what lets `listServerAdapters()` enumerate a heterogeneous set — Claude, Codex, Gemini, Kimi, OpenCode, Cursor, Pi, Hermes (local and gateway), OpenClaw, `process`, `http`, and the native `paperclip_runner` — behind one interface (`server/src/adapters/registry.ts:875-896`; `docs/adapters/overview.md:19-32`).

One further generic dimension is `runtimeToolDelivery`, a three-valued flag (`packages/adapter-utils/src/types.ts:174`):

| Value | Meaning | Used by |
| --- | --- | --- |
| `native_mcp` | Run-scoped control tools are injected as an MCP server | `claude_local`, `codex_local` (`registry.ts:256, 332, 24913-24920`) |
| `environment` | Tools arrive as environment variables | `hermes_local`, most CLI adapters (`registry.ts:808`) |
| `invocation_context` | Tools are placed in the invocation context (the prompt/context object) | `hermes_gateway`, `openclaw_gateway`, `cursor_cloud`, `http` (`registry.ts:706, 803, 813`; `server/src/services/heartbeat.ts:24911-24928`) |

The heartbeat code sets `adapterContext.paperclipRuntimeTools = runtimeTools` only when delivery is `invocation_context` (`heartbeat.ts:24926-24928`). So a Hermes gateway agent does not receive a native MCP tool socket for Paperclip's own control tools; it is expected to reach Paperclip over HTTP with `PAPERCLIP_API_URL`/`PAPERCLIP_API_KEY`, which is exactly what the gateway prompt tells it to do (`packages/adapters/hermes/src/gateway/server/execute.ts:288-307`; `packages/adapters/hermes/README.md:156-169`).

### 3.4 `adapter-plugin.md` is a work log, not a specification

The file named `adapter-plugin.md` at the repo root is **not** the plugin specification. It is a branch work-log entry beginning "Created branch: feat/external-adapter-phase1" and describing a TDD phase-1 refactor (`adapter-plugin.md:1-3`). The actual external-adapter contract is documented in `docs/adapters/external-adapters.md` and implemented in `server/src/adapters/registry.ts` and the plugin loader. Anyone reading `adapter-plugin.md` expecting a spec would be misled by its name; the mechanism itself (a package exports `createServerAdapter()` returning a `ServerAdapterModule`, installed from npm or a local path, recorded in `~/.paperclip/adapter-plugins.json`) is confirmed by `docs/adapters/external-adapters.md:111-151, 274-313` and by `registry.ts:949-972`.

### 3.5 Feedback granularity is a first-class adapter property

Adapter choice determines how much live structure the transcript shows, and the docs rank it explicitly: native ACP engines emit per-moment JSONL events (`acpx.session`, `acpx.status`, `acpx.text_delta`, `acpx.tool_call`, `acpx.result`, `acpx.error`); CLI wrappers get whatever their own streaming JSON emits; generic adapters get raw stdout/stderr (`docs/adapters/overview.md:125-135`). Hermes sits in the middle tier for `hermes_local` — its raw stdout is parsed into typed `TranscriptEntry` objects (`packages/adapters/hermes/README.md:23-24, 299-312`).

---

## 4. Context in, results out, streaming, approval, stop

### 4.1 What goes in

`AdapterExecutionContext` carries the run identity, the agent, the runtime session view, config, context, and the host callbacks (`onLog`, `onMeta`, `onEvent`, `onSpawn`, `onDispatch`, `onRuntimeProgress`), plus a run-scoped `AbortSignal` and `authToken` (`packages/adapter-utils/src/types.ts:199-253`). Two comments in that interface are worth quoting as design intent: the signal is a "run-scoped operator cancellation; adapters must settle before returning" and `onDispatch` exists so a continuation gate can release its issue lock once the runtime has actually been entered (`types.ts:201-203, 236-242`).

For the Hermes gateway, the adapter assembles the prompt in `buildInput` (`packages/adapters/hermes/src/gateway/server/execute.ts:266-322`): agent/company/run identity, the Paperclip API URL, an execution contract, the wake prompt, an optional session handoff, the task markdown, and a structured wake-payload JSON block. It deliberately sets `includeExecutionContract: false` in the shared prompt-section helper and writes its own contract, with a comment noting the gateway "owns the execution contract below" (`execute.ts:275-307`).

The final request body is `{ ...payloadTemplate, input, instructions, session_id? }` (`execute.ts:324-341`).

### 4.2 Session continuity

Session resume is explicit and configurable via `sessionKeyStrategy`, one of `issue` (default), `agent`, `run`, or `none` (`packages/adapters/hermes/src/gateway/server/config-schema.ts:31-42`). The key is built deterministically and sent as the `X-Hermes-Session-Key` header (`execute.ts:151-167, 262`). The default is issue-scoped, and the config hint says this "prevents cross-task memory bleed by default" (`config-schema.ts:41`). `hermes_local` achieves the same end with the CLI's `--resume <id>` flag (`packages/adapters/hermes/src/server/execute.ts:477-479`).

### 4.3 What comes back

Everything collapses into `AdapterExecutionResult` (`packages/adapter-utils/src/types.ts:79-143`): `exitCode`, `signal`, `timedOut`, `errorCode`/`errorFamily`/`retryNotBefore`, `usage`, `sessionParams`/`sessionDisplayId`, `provider`, `model`, `costUsd`, `resultJson`, and `summary`. The gateway adapter's `mapFinalResultForTest` maps the terminal Hermes status to this shape, extracting usage, cost, session id, model, and a 2,000-character summary, and packing the raw run into `resultJson` (`packages/adapters/hermes/src/gateway/server/execute.ts:662-710`). Error classification maps HTTP status to stable codes and error families — 401/403 → `hermes_gateway_auth_failed`, 404 → `hermes_gateway_runs_unsupported`, 429 and 5xx → `transient_upstream` (`execute.ts:353-359`).

The `usageBasis` field distinguishes per-run from session-cumulative token totals, so the server can delta a cumulative provider correctly (`types.ts:96-102`). This is a small detail our own platform should copy: without it, session-resumed runtimes silently double-count.

### 4.4 Streaming

The gateway consumes SSE from `/v1/runs/{run_id}/events` and, in parallel, polls `/v1/runs/{run_id}` as a fallback (`packages/adapters/hermes/src/gateway/server/execute.ts:906-925`). SSE frames are parsed into `{event, data}` pairs; `message.delta` events accumulate output chunks and stream them to the run log (`execute.ts:477-509`). A terminal status (from `completed`, `failed`, `error`, `cancelled`, `canceled`, `stopped`, `interrupted`) resolves a promise that the main `execute` races against a timeout (`execute.ts:77-85, 500-508, 933`). If the stream drops or returns a non-200, the adapter logs and falls back to polling rather than failing the run (`execute.ts:576-585`).

The native runner has its own richer durable transport: a loopback WebSocket with a one-time bootstrap ticket, a connection lease kept only in runner memory, a durable outbox, and cumulative ACKs; each event is written locally before network delivery and removed only after a valid ACK (`packages/paperclip-runner/docs/architecture.md:192-215`).

### 4.5 Approval

Approval exists in two unrelated places, and they should not be conflated.

**MCP gateway approval** is the control plane's tool-call approval. When a policy resolves a call to `require_approval`, the gateway opens an **Action Request** carrying the agent/run/tool identity, a canonical hash of the arguments, the signed arguments the approver sees verbatim, a linked issue-thread interaction, and an expiry. The gateway answers the agent's call with HTTP `409`, `reasonCode: "approval_required"`, and an `actionRequestId`; the run is paused on that exact call until a decision lands, and the agent retries with `approvedActionRequestId` (`doc/MCP-ACCESS-GOVERNANCE.md:315-326`). The demo script shows the same flow end to end with a real KV server (`doc/MCP-DEMO-SCRIPT.md:204-260`).

**Native runner permissions** are a separate provider-level concern: ACPX Claude defaults to `approve-all`, OpenCode to `allow`, native Codex to `never`, and restrictive profiles route permission decisions through durable runtime requests and existing task interaction controls (`packages/paperclip-runner/README.md:116-138`). The runner also exposes a first-class `request_human_input` tool for typed, durable interactions (`semantic-action-catalog.ts:220-258`).

A boundary worth noting: `hermes_local` runs Hermes with `--yolo` and the smoke config seeds `command_allowlist: [execute_code]`, because a Paperclip agent has no TTY and interactive approval prompts would always time out (`packages/adapters/hermes/src/server/execute.ts:470-475`; `doc/HERMES_GATEWAY_SMOKE.md:47-50`). So a Hermes agent's *own* dangerous-command approval is disabled; approval lives at the Paperclip control plane instead. This is a deliberate trade of runtime-level safety for control-plane-level governance, and it only works because the agent is treated as sandboxed.

### 4.6 Stop

Stopping a gateway run is `POST /v1/runs/{run_id}/stop`, invoked when the timeout fires, followed by a bounded wait for a terminal status (`packages/adapters/hermes/src/gateway/server/execute.ts:712-754, 937-959`). The result is `timedOut: true`, `errorCode: "hermes_gateway_timeout"`, with the last observed status in `resultJson` (`execute.ts:940-958`). The `AbortController` also cancels the SSE consumer and poller (`execute.ts:907-935`).

The native runner's stop story is more rigorous and is the better model. The ACP run lifecycle describes one coordinator that sequences startup → turn → settlement → result reproduction, with a **resource ledger** as the single owner of six run resources (`acp_runtime`, `staged_runtime`, `control_bridge`, `agent_bridge`, `managed_home`, `staging_lease`) and a fixed settlement order (`doc/acp-run-lifecycle.md:7-90`). Two rules stand out:

- The coordinator reproduces the external result **after** settlement, "so a caller never observes a result before the run releases its resources" (`acp-run-lifecycle.md:28-30`).
- A per-session staging lease releases as the run's **final** act, inside a `finally`, so a second run of the same session can never re-stage into a workspace the first still uses (`acp-run-lifecycle.md:80-90`).

The doc also records an honest known limitation: host-lane runtime reuse is disabled because a run-minted API key is never revoked on run end, so a warm runtime would carry a still-valid credential into the next run (`acp-run-lifecycle.md:102-109`).

---

## 5. The MCP access governance model

Paperclip plays two MCP roles, and the doc calls confusing them "the most common operator error" (`doc/MCP-ACCESS-GOVERNANCE.md:97-124`):

- **Endpoint mode** — external clients (Claude Code, IDEs) call Paperclip's own `/mcp` surface to manipulate tasks and agents. Access control is the standard Paperclip auth model.
- **Gateway mode** — a Paperclip agent's tool calls are proxied through Paperclip to an upstream MCP server, with profile selection, policy evaluation, approval, rate limiting, redaction, and audit.

The governance rules below are gateway-mode rules.

### 5.1 Four separated concerns

The mental model separates: **Application** (logical grouping) → **Connection** (one MCP endpoint, transport `remote_http` preferred or `local_stdio` gated) → **Catalog Entry** (one discovered tool, with a risk level and a status) → **Profile** (a named allow/deny bundle, attached to scopes via **Bindings**) → **Policy** (an orthogonal call-time rule) → **Gateway** (the runtime that walks profiles and policies, records a Call Event, and opens an Action Request) (`doc/MCP-ACCESS-GOVERNANCE.md:25-62`). The one-line summary: "profile says *can this agent see the tool*; policy says *is this exact call allowed right now*" (`MCP-ACCESS-GOVERNANCE.md:62`).

### 5.2 Transport and local-trust

`remote_http` is the preferred production path; `local_stdio` runs a supervised child process and is only allowed where the host is explicitly trusted (`MCP-ACCESS-GOVERNANCE.md:141-146, 401-422`). Operators cannot paste arbitrary `command`/`args`; allowed stdio entries are limited to an approved template catalog, and adding a template is a code change (`MCP-ACCESS-GOVERNANCE.md:146`). The decision matrix: `local_trusted` always allows local stdio; `authenticated/private` allows it with explicit opt-in; `authenticated/public` fails closed unless one worker is designated with `PAPERCLIP_TRUSTED_MCP_RUNTIME_HOST` and is isolated from the public edge (`MCP-ACCESS-GOVERNANCE.md:408-420`).

### 5.3 Risk classification and changed-tool quarantine

Every discovered tool gets a risk level from MCP annotations: `read` (`readOnlyHint: true`), `write` (write hint), or `destructive` (`destructiveHint: true`) (`MCP-ACCESS-GOVERNANCE.md:198-208`). The key rule: **when a catalog refresh discovers a new write or destructive tool that did not exist on the prior schema, it is set to `status: quarantined` and never returned to the agent's tool list until an operator reviews it** (`MCP-ACCESS-GOVERNANCE.md:208`). The doc calls this "the primary defense against an upstream server silently adding a destructive verb" (`MCP-ACCESS-GOVERNANCE.md:208`). The demo confirms the mechanism: the KV server tags `kv_delete` with `destructiveHint: true` and it is quarantined automatically (`doc/MCP-DEMO-SCRIPT.md:59, 86`).

### 5.4 Profiles, bindings, and grants

A profile has a `defaultAction` and a list of entries with selectors (`application`, `connection`, `catalog_entry`, `tool_name`, `risk_level`) and effects (`include`/`exclude`) (`MCP-ACCESS-GOVERNANCE.md:237-245`). Bindings attach a profile to an actor at a scope, narrowest first: `issue` > `routine` > `agent` > `project` > `company`; the effective profile is computed at session time and cached on the gateway session (`MCP-ACCESS-GOVERNANCE.md:246-252`). Stored tool grants can further restrict access with `scope.allow` and selectors, and "a revoked grant cannot authorize a later call merely because discovery previously listed it" (`MCP-ACCESS-GOVERNANCE.md:254-274`).

### 5.5 Policies and the evaluation order

Five policy types: `allow`, `block`, `require_approval`, `rate_limit`, `trust_rule` (`MCP-ACCESS-GOVERNANCE.md:276-286`). **Deny always beats allow** (`MCP-ACCESS-GOVERNANCE.md:282`). The evaluation order is: (1) quarantined/disabled catalog entry → immediate deny; (2) profile membership → deny if absent; (3) policies in priority order, with `block` and `require_approval` short-circuiting; (4) otherwise allow (`MCP-ACCESS-GOVERNANCE.md:288-292`). A dry-run endpoint returns the decision without making a real call (`MCP-ACCESS-GOVERNANCE.md:294-313`).

### 5.6 Approval, trust rules, and the exact-hash invariant

Approval is bound to a **canonical hash of the reviewed arguments**. After approval, the operator may promote it into a `trust_rule` policy, but only for the same tool, same actor scope, and the same exact argument shape (`MCP-ACCESS-GOVERNANCE.md:326-357`). Trust rules carry the catalog and schema hashes captured at approval time; if the upstream tool changes its schema or the argument hash drifts, the trust rule stops applying and the next call falls back to `require_approval` (`MCP-ACCESS-GOVERNANCE.md:357`). Changing the arguments between approval and retry fails with `signed_arguments_mismatch` (`MCP-ACCESS-GOVERNANCE.md:357`). The doc states the intent plainly: "an approval is for a specific argument shape, not for 'future versions of this tool, sight unseen'" (`MCP-ACCESS-GOVERNANCE.md:357`).

The native runner enforces the same principle at the tool layer: `search_api`/`call_api` require the exact `operationId` returned by discovery and forbid guessing identifiers (`call-api.ts:68-73`), and the capability engine's `authorizeInvocation` re-evaluates at call time even when exposure already allowed the tool (`packages/paperclip-runner/docs/capability-authorization-and-exposure.md:22-39`).

### 5.7 Runtime slots, audit, and limitations

Local stdio connections run as supervised child processes with a slot lifecycle `stopped → starting → running → idle → (stopped|failed)`, spun up on first call and evicted after idle expiry (`MCP-ACCESS-GOVERNANCE.md:361-371`). The runtime runbook defines the stuck-slot alerts and the recovery procedure (stop, restart once, disable if restart suppression fires) and lists the runtime-health metrics (`doc/MCP-RUNTIME-OPERATIONS.md:39-132`). Notably, native runner MCP assignments are immutable per agent: the gateway stores the owner in `agentId` and the run context scope, and invalid ownership or assignment metadata rejects the token with `gateway_token_run_context_invalid`; the reserved `native:` profile key identifies a native assignment even if its metadata is cleared (`MCP-RUNTIME-OPERATIONS.md:16-37`).

Audit is append-only. Every invocation lands in `tool_call_events` with the decision, matched policy IDs, reason code, redaction plan, latency, and final outcome, and there is no edit or delete route (`MCP-ACCESS-GOVERNANCE.md:375-399`). A per-run timeline endpoint returns every policy decision attached to one run (`MCP-ACCESS-GOVERNANCE.md:396`).

The v1 limitations are stated honestly and are as instructive as the features (`MCP-ACCESS-GOVERNANCE.md:424-435`): audit-write failures are treated as control-plane incidents; there is no CLI surface; no bulk catalog review; trust rules match exact argument shapes only; rate limits are per-policy with no cross-policy aggregation; action-request expiry is server-set and cannot be extended; endpoint mode is not policy-governed; and local stdio slots do not migrate across workers. A separate boundary is also stated: "V1 does not claim host-wide MCP enforcement" — if an unmanaged client calls an upstream MCP server directly, Paperclip can warn but cannot prevent or audit the bypass, so managed MCP config is "a control-plane containment feature for Paperclip-launched agents, not an endpoint firewall for the operator's whole machine" (`MCP-ACCESS-GOVERNANCE.md:135`).

---

## 6. Lessons for our platform

- **Make the runtime boundary an HTTP contract, not an embedded dependency.** Paperclip's Hermes gateway is a thin client over four endpoints, and the adapter never imports Hermes code (`packages/adapters/hermes/src/gateway/server/execute.ts:861-967`; `doc/HERMES_GATEWAY_ONBOARDING.md:40-54`). We should define the same shape for our Hermes engine: create-run, stream, poll, stop, plus a health/capabilities probe (`doc/HERMES_GATEWAY_ONBOARDING.md:155-156`). This keeps the runtime replaceable and testable with a mock, exactly as Paperclip's own E2E smoke does.

- **Separate the three credentials and give each a clear direction.** Paperclip's doc explicitly forbids reusing the gateway key as the agent key (`doc/HERMES_GATEWAY_ONBOARDING.md:23-38`). Our control plane will have the same three directions (control→runtime, runtime→control, runtime→provider); naming them distinctly up front avoids a class of confused-deputy bugs.

- **Adopt the single-result envelope, including `usageBasis`.** Collapsing every runtime into one `AdapterExecutionResult` with `exitCode`, `errorFamily`, `retryNotBefore`, `usage`, `sessionParams`, and `resultJson` is what makes a heterogeneous adapter registry tractable (`packages/adapter-utils/src/types.ts:79-143`). The `usageBasis: "per_run" | "session_cumulative"` field (`types.ts:96-102`) is the detail that stops resumed sessions from double-counting tokens — copy it.

- **Make tool delivery a declared adapter property.** `runtimeToolDelivery` (`native_mcp` / `environment` / `invocation_context`) lets one control plane serve runtimes with very different tool-injection mechanisms (`packages/adapter-utils/src/types.ts:174`; `server/src/services/heartbeat.ts:24911-24928`). We should declare, per runtime, how it receives control tools rather than special-casing runtime names.

- **Steal the changed-tool quarantine.** Auto-quarantining any newly discovered write/destructive MCP tool on catalog refresh, and never returning it to the model until a human reviews it, is a cheap and high-value defense against a compromised or upgraded upstream (`doc/MCP-ACCESS-GOVERNANCE.md:208`). We should make this a default, not an option.

- **Bind approvals to exact arguments, and expire trust on schema change.** The `signed_arguments_mismatch` rule and the schema-hash-bound trust rules (`doc/MCP-ACCESS-GOVERNANCE.md:326-357`) are the right granularity: an approval authorizes one reviewed call shape, not a tool forever. Our approval model should store the canonical argument hash and re-validate on retry.

- **Copy the native runner's settlement discipline, not the gateway's simpler stop.** Reproducing the result only after every resource is settled, releasing a per-session lease as the final act inside a `finally`, and recording per-phase run-log events with no command/argument/path payloads (`doc/acp-run-lifecycle.md:7-100`) is a materially better lifecycle than "fire stop and wait for terminal status." If our control plane supervises long-lived sessions, this is the model.

- **Make audit append-only and make audit-write failure a paging incident.** Paperclip treats a failed audit write as a control-plane incident and has no edit/delete route on the call-event log (`doc/MCP-ACCESS-GOVERNANCE.md:399, 428`). For a company OS where humans and AI employees share a workspace, an un-auditable tool call should be a stop-the-line event.

- **Escape hatches must be bounded, on by default, and fail closed.** `search_api`/`call_api` are available by default but are rate-limited by request size, capture size, per-run budget, and a company quota, and they cannot bypass lifecycle tools (`doc/runner-api-tools.md:9-26, 54-146, 167-185`). The design lesson is that a generic API fallback is acceptable only when it is *budgeted* and *cannot escalate privilege*.

- **Be honest about what governance does not cover.** Paperclip states plainly that endpoint mode is not policy-governed and that a bypassing client cannot be stopped (`doc/MCP-ACCESS-GOVERNANCE.md:135, 434`). We should document our own containment boundary with the same precision rather than implying host-wide enforcement.

- **Do not confuse a work log with a spec.** `adapter-plugin.md` is a branch changelog, and the real plugin contract lives elsewhere (`adapter-plugin.md:1-3`; `docs/adapters/external-adapters.md:111-151`). Our own repo should keep ephemeral branch notes out of spec-named files, or future readers (and agents) will trust the wrong document.

---

## What I could not verify

- **The exact server-side persistence mapping from `agentDefaultsPayload` into an agent's `adapterConfig`.** I confirmed that the server validates and normalises the gateway payload (`server/src/routes/access.ts:744-838`) and that a `buildJoinDefaultsPayloadForAccept` step exists (`access.ts:3799-3803`), but I did not trace the full write path to the stored agent row, so I cannot state precisely which keys survive as `ctx.config`. The adapter itself reads `apiBaseUrl`/`url`, `apiKey`/`token`, `sessionKeyStrategy`, `timeoutSec`, `headers`, `instructions`, and `paperclipApiUrl` (`packages/adapters/hermes/src/gateway/server/execute.ts:784-838`; `config-schema.ts:7-74`), so those are the keys that must arrive.

- **Hermes's own API contract.** Everything here about `/v1/runs`, `/v1/runs/{id}/events`, `/v1/runs/{id}`, `/v1/runs/{id}/stop`, `/health`, and `/v1/capabilities` is read from Paperclip's client code and smoke docs, not from Hermes's source (which is not in this subject tree). Whether Hermes's real response fields always match the adapter's tolerant extractors (`extractRunId`, `extractStatus`, `extractOutput` — `execute.ts:395-475`) is not something I could check against the upstream server.

- **The `MCP-DEMO-SCRIPT.md` KV demo end-to-end.** I read the script but did not run it; the steps are internally consistent with `MCP-ACCESS-GOVERNANCE.md`, and the demo's own "what this proves" section claims the three cases, but I did not independently execute the flow.

- **Whether the native runner's semantic catalog is fully wired in production.** The catalog is declared in `semantic-action-catalog.ts` and the package README states the production binding is `server/src/services/native-runtime/paperclip-control-plane-port.ts` and is "test-only" for conformance (`packages/paperclip-runner/README.md:482-485`; `docs/architecture.md:20-25`). I did not verify which subset of the catalog is live in a running Paperclip server, so the catalog should be read as the intended contract, not as a confirmed production inventory.

- **A minor doc/code disagreement, resolved in favour of the code.** `packages/adapters/hermes/README.md:22` says the adapter provides "8 inference providers" and names "Anthropic, OpenRouter, OpenAI, Nous, OpenAI Codex, ZAI, Kimi Coding, MiniMax"; the same file's config table (`README.md:224`) lists `auto, openrouter, nous, openai-codex, zai, kimi-coding, minimax, minimax-cn`. Neither prose list matches the code. The authoritative list is `VALID_PROVIDERS` in `packages/adapters/hermes/src/shared/constants.ts:34-47`, which is longer than eight and also includes `copilot`, `copilot-acp`, and `huggingface`. The README's "8 providers" claim is therefore an undercount; trust the constant.
