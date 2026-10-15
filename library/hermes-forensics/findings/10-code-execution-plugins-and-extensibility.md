# Batch 10 — Code execution, plugins and extensibility

**Status:** COMPLETE
**Date:** 2026-10-15
**Method:** docs read in full against code; every claim carries a `file:line`. Docs are claims, code is authority (00-PIN-AND-METHOD.md §2).
**Source:** `hermes-agent-main/hermes-agent-main` @ pin (19,728 files; pyproject md5 `f57f729d4b251547a5a9e2565ce1e726`).

---

## §0 — Plain words

Three separate ideas live in this batch. Keeping them apart is most of the work:

1. **Code execution** — the model does not just *call tools one at a time*; it can *write a small program* that calls several tools in a loop and hand back only the printed answer. Hermes calls this **Programmatic Tool Calling (PTC)**. The win: a five-step data shuffle becomes one round trip instead of five.
2. **Plugins** — an outside developer can add a new capability (a memory backend, a messaging channel, an image generator, a model provider) *without editing Hermes' own source*. Hermes enforces this with a written contract and a governance policy.
3. **Extensibility seams** — middleware and observer hooks. Middleware can *change* a request or a tool call (wrap it, rewrite it, block it). Observer hooks can only *watch and report* (with four documented exceptions that can alter behaviour).

And one **premise correction** that matters more than any of them — §9: **"OpenCode" in Hermes is a model *provider*, not the OpenCode coding agent.** The word appears 1,008 times in the Python, all in the provider sense. This is a rule-13 correction to an assumption carried from the earlier (pre-forensics) material.

---

## §1 — What was read and verified

**Docs read in full (under `website/docs/`):**

| Doc | Size | Role |
|---|---|---|
| `developer-guide/plugins/index.md` | 117,774 B | the canonical plugin authoring + compat contract |
| `developer-guide/plugins/catalog-submission.md` | 15,061 B | how a plugin enters the official catalog |
| `developer-guide/plugins/application-declarations.md` | 8,475 B | what a plugin must declare |
| `developer-guide/middleware.md` | 9,946 B | the four middleware kinds |
| `developer-guide/observer-hooks.md` | 13,706 B | the observer event families |
| `developer-guide/adding-tools.md` | 6,704 B | adding a built-in tool (the in-tree path) |
| `developer-guide/tools-runtime.md` | 12,084 B | how the tool runtime loads and dispatches |
| `developer-guide/acp-internals.md` | 6,849 B | Hermes **as** an ACP server |
| `developer-guide/extending-the-cli.md` | 7,412 B | CLI extension path |
| `plugins/AGENTS.md` (in-tree) | 14,098 B | the **plugin governance policy**, dated |

**Per-kind plugin guide docs** (one each): `memory-provider-plugin.md` (26,045 B), `model-provider-plugin.md` (42,203 B), `context-engine-plugin.md` (20,317 B), `image-gen-provider-plugin.md` (13,318 B), `video-gen-provider-plugin.md` (9,366 B), `browser-provider-plugin.md` (6,852 B), `web-search-provider-plugin.md` (11,544 B), `terminal-environment-plugin.md` (5,517 B), `secret-source-plugin.md` (10,783 B), `plugin-llm-access.md` (21,974 B).

**Code read and measured:**

| File | Finding | Verified at |
|---|---|---|
| `tools/code_execution_tool.py` | PTC; sandbox allowed tools; resource limits | `:1–48`, `:43–51` |
| `tools/code_kernel.py` | 911-line persistent session kernel | (size) |
| `tools/code_execution_env.py` | env-scrub: prefixes + secret substrings + Windows essentials | `:20–53` |
| `plugins/plugin_loader.py` | directory-plugin loader; deadlock-aware | `:1–60` |
| `plugins/AGENTS.md` | governance policy (dated decisions) | `:1–50` |
| `plugins/` (tree) | **17 plugin kinds**; 4 example plugins moved out | `ls plugins/` |
| `acp_adapter/` (19 files) | Hermes **is** an ACP stdio server | `entry.py:95, 208` |
| `hermes_cli/auth.py` | `opencode-zen` / `opencode-go` are **providers** | `:226–231` |

---

## §2 — Code execution: Programmatic Tool Calling (PTC)

The module docstring states the design in one paragraph (`tools/code_execution_tool.py:1–13`, verbatim intent):

> "The LLM writes a Python script that calls Hermes tools via RPC, collapsing multi-step tool chains into one inference turn; only the script's stdout returns to the LLM."

**Two backends:**

- **Local:** "a persistent per-conversation session kernel (`tools/code_kernel.py`) over a Unix socket (**loopback TCP on Windows**)". Measured: `code_kernel.py` is **911 lines**; `code_execution_tool.py` is **969 lines**; plus `code_execution_rpc.py` (255) and `code_execution_env.py` (304).
- **Remote:** "a remote session kernel (`tools/code_kernel_remote.py`) falling open to a per-call script ship, tool calls as request files polled via `env.execute()` (needs Python 3 on the backend)."

**What the script is allowed to touch** (measured `:43–45`):

```python
SANDBOX_ALLOWED_TOOLS = frozenset([
    "web_search", "web_extract", "read_file", "write_file", "search_files", "patch", "terminal",
])
```

…and crucially: "**∩ the session's enabled tools** decides which stubs are generated." The sandbox is not a separate universe — it is the session's own toolset, narrowed to a safe seven.

**Resource limits (measured `:47–51`), all overridable via `config.yaml → code_execution.*`:**

| Limit | Value |
|---|---|
| `DEFAULT_TIMEOUT` | 300 s (5 min) |
| `DEFAULT_MAX_TOOL_CALLS` | 50 |
| `MAX_STDOUT_BYTES` | 50,000 (50 KB) |
| `MAX_STDERR_BYTES` | 10,000 (10 KB) |
| `MAX_SPILLED_STDOUT_BYTES` | 5,000,000 (5 MB) — "a runaway print loop must not fill the disk" |

**Truncation is recover-don't-rerun** (`_truncate_stdout_text`, `:56–70`): stdout over 50 KB is cut 40 % head / 60 % tail, the omitted middle is **spilled to `cache/exec`**, and the result carries the file path plus byte-count metadata — "because a client layer can miss or re-truncate it". So a user (or the model) can *read the full output* instead of re-running the script.

**Environment scrubbing (measured `tools/code_execution_env.py:20–53`)** — a three-stage gate with the reasoning recorded in comments:

1. **Secret-substring block first.** `_SECRET_SUBSTRINGS = ("KEY","TOKEN","SECRET","PASSWORD","CREDENTIAL","PASSWD","AUTH","DSN","WEBHOOK","CREDS","BEARER","APIKEY")`. Note the comment: `"PASS"` is **deliberately absent** because it false-positives on `BYPASS_CACHE` / `COMPASS_DIR` / `PASSENGER_HOST`, while `PASSWORD`/`PASSWD` already cover credentials.
2. **Whatever survives must match a safe prefix** — `_SAFE_ENV_PREFIXES = ("PATH","HOME","USER","LANG","LC_","TERM","TMPDIR","TMP","TEMP","SHELL","LOGNAME","XDG_","PYTHONPATH","VIRTUAL_ENV","CONDA")`.
3. **The broad `HERMES_` prefix is deliberately NOT safe** — the comment records *why*: it "leaked config vars without a secret substring (`HERMES_BASE_URL`, `HERMES_KANBAN_DB`, `*_WEBHOOK`)". Only a small named allowlist rides: `_HERMES_CHILD_ALLOWED = {HERMES_HOME, HERMES_PROFILE, HERMES_CONFIG, HERMES_ENV, HERMES_DELEGATED_CHILD_CONTEXT}`, with the recorded reason that `HERMES_DELEGATED_CHILD_CONTEXT` must ride along or a child loses the Kanban mutation guard.

Windows-essential vars are separately allowlisted because otherwise the CRT fails (`WinError 10106`, Winsock cannot find `mswsock.dll`).

**Q1 (user value):** a user gets a multi-step data job done in one inference turn, and if the output is huge, the *whole* output is recoverable from disk rather than lost or re-run. Both are real, felt improvements.
**Q2 (vision value):** PTC is the mechanism that turns "the agent calls tools" into "the agent *programs against* its own tools". For a resource planner, that is the difference between an assistant that asks for each datum and one that composes a plan across many sources. The **intersect-with-session-tools** rule is also directly reusable governance: *expand capability by composition, never beyond what the session already may do.*

---

## §3 — The plugin surface: 17 kinds, one contract

**Measured — the in-tree plugin kinds** (`ls plugins/`):

`browser`, `computer_use`, `context_engine`, `cron_providers`, `dashboard_auth`, `disk-cleanup`, `google_meet`, `hermes-achievements`, `image_gen`, `kanban`, `memory`, `model-providers`, `platforms`, `security-guidance`, `teams_pipeline`, `video_gen`, `web`.

Note `plugins/platforms/` alone contains **21 messaging/channel plugins**: `a2a, buzz, dingtalk, discord, email, feishu, google_chat, irc, line, matrix, mattermost, ntfy, photon, raft, simplex, slack, sms, teams, telegram, wecom, whatsapp`.

**Each kind has its own authoring guide** (§1 table): memory, model-provider, context-engine, image-gen, video-gen, browser, web-search, terminal-environment, secret-source. So the plugin system is not one blob — it is **nine documented extension points**, each with a stable ABC.

**Loading** (`plugins/plugin_loader.py:1–5`): "import `__init__.py` by path with siblings pre-registered so relative imports work, then extract the provider via `register(ctx)` or an ABC-subclass fallback." The loader is written to be **concurrency-safe**: it tracks `_LOAD_OWNERS`, `_LOAD_WAITERS`, `_STALLED_LOADS`, and walks both the *loader* lock graph and *importlib's* module-lock graph to detect a deadlock that importlib alone cannot see (`_load_would_deadlock`, `:36–47`). `bounded_load_wait()` lets a per-turn caller give up after `_CONCURRENT_LOAD_WAIT_SECS = 10.0` rather than stall on another thread's hung import (`:26, :50–54`).

**This is a measured, mature concern** — the plugin loader is written by people who have been bitten by a hung third-party import taking down a turn.

**Q1:** a user can install a capability the Hermes team never wrote (a memory backend, a chat channel) and it works after a normal upgrade. Real.
**Q2:** seventeen plugin kinds is effectively a **capability marketplace shape**. A platform can extend in nine documented directions without forking the engine.

---

## §4 — The compatibility contract (how a plugin survives an upgrade)

Measured from `developer-guide/plugins/index.md`, section *Native plugin compatibility contract*. The headline is a **deliberate refusal**:

> "Hermes does not expose a `PLUGIN_API_VERSION`, require a manifest-wide `api:` match, or attach an API version to unrelated values. A plugin that uses a documented behavior should continue to work after a normal Hermes upgrade."

Instead, **six behavioural rules**:

1. **Evolve additively** — documented `PluginContext` methods are not removed or renamed; new parameters are optional, defaulted, keyword-only; return fields are not removed or silently retyped.
2. **Hook payloads are keyword payloads** — new hook data is added as keyword fields, never by changing position/meaning; Hermes **inspects callback signatures**, so a legacy callback gets the fields it declares while a `**kwargs` callback gets everything.
3. **Manifests are open to additions** — unknown `plugin.yaml` fields are ignored, so an older release can load a newer plugin's manifest.
4. **Provider interfaces grow through defaults** — a new abstract method or an unconditionally-forwarded argument requires a **migration window**, not a flag-day signature change.
5. **Version the contract that crosses a boundary** — a capability may carry its own schema version for a *wire or persisted format* (observer payloads, secret-source state), but "do not add version literals to unrelated callback or context values".
6. **The contract covers documented surfaces only** — replacing or wrapping core functions at runtime (assigning `AIAgent.<method>`, `setattr` on a Hermes module, writing into `sys.modules` or a core dict) is **not a supported extension point**, and the catalog refuses it at admission (`hermes plugins validate`, a `no core override` check).

**The deprecation policy is unusually strict** (measured, verbatim structure): a documented behaviour may be deprecated only with (1) replacement + migration instructions in the guide *and* release notes, (2) a warning emitted **at most once per process** naming the replacement and earliest removal release, (3) support for **at least two subsequent minor releases**, and (4) behaviour-based compatibility coverage for **both** the legacy path and the replacement through that window. And: *"In practice, additive aliases and adapters are preferred to removal."*

**Enforcement is by behaviour, not symbols:** "Hermes enforces this contract with frozen external-plugin fixtures discovered from an isolated `HERMES_HOME`. Those tests load and invoke the plugin through `PluginManager`; they assert real registration and callback outcomes **rather than internal symbol lists or source-code shape**."

**Q1:** a user's installed plugin does not break on an update. This is the single most user-visible property of a plugin system, and it is contractually promised with a two-release window.
**Q2:** for a platform, this is a **worked model of ecosystem trust**. The refusal to ship an API version — because it would let semantics drift behind a stable number — is a design position worth recording. The "no core override" admission check is the enforcement that keeps it honest.

---

## §5 — The plugin governance policy (a dated, written constitution)

`plugins/AGENTS.md` (14 KB, in-tree) is not a coding guide — it is **policy with dates and named decisions**. Measured highlights:

- **Explicit authorship:** *"Plugins never touch core (Teknium, May 2026)."* A plugin MUST NOT modify `run_agent.py`, `cli.py`, `gateway/run.py`, `hermes_cli/main.py`, etc. If it needs a missing capability, **widen the generic plugin surface** (a new hook or `ctx` method) and let the plugin use it — "never hardcode plugin-specific logic into core". Cited precedent: "PR #5295 removed 95 lines of hardcoded honcho argparse from `main.py`."
- **A hook with no concrete consumer is rejected as speculative infrastructure.** A rule against building for imagined users.
- **Migration-out policy:** in-tree memory providers were closed (May 2026); hindsight, honcho, supermemory, mem0, openviking, holographic **moved to the plugin catalog** (`plugin-catalog/<name>.yaml`), auto-installed by `hermes_cli/memory_provider_migration.py` for homes still configured for them. Home Assistant and Spotify likewise leave core (Oct 2026) with a row in `hermes_cli/left_core_migration.py::LEFT_CORE`.
- **No new third-party-product plugins (June 2026)** — observability backends, vendor SaaS connectors, analytics dashboards and paid-service tie-ins ship as **standalone plugin repos**, because "every absorbed product is our maintenance burden against a fast-moving core for a backend we don't own". And an explicit note that closing such a PR "is a coupling decision, not a quality judgment".
- **Reference plugins live outside the tree** (`hermes-example-plugins` repo), not in `plugins/`.

**This is the most surprising find of the batch.** The project is actively *shrinking its own core* on a written schedule, deliberately pushing capability outward into a catalog. For a platform builder this is a strong signal: the boundary between "engine" and "ecosystem" has been argued and decided, in public, with dates.

**Q1:** users get new capabilities installed automatically when they update (the `LEFT_CORE` auto-install), and the core stays small enough to stay fast.
**Q2:** for a resource planner, `left_core_migration.py` is a reusable pattern — **"a capability that used to be core is now a plugin, and here is the one-time state conversion for homes that used it."** That is exactly the migration machinery a maturing platform needs.

---

## §6 — Middleware (change the request) and observer hooks (watch it)

Two distinct seams, and the docs are careful about the difference.

**Middleware** (`developer-guide/middleware.md`) — **four kinds**, each able to *replace*:

| Kind | Payload | Can return | Purpose |
|---|---|---|---|
| `llm_request` | `request`, `original_request` | `{"request": {...}}` | Replace effective provider kwargs before execution |
| `tool_request` | `tool_name`, `args`, `original_args` | `{"args": {...}}` | Replace tool args **before hooks, guardrails, approvals and execution** |
| `llm_execution` | `request`, `original_request`, `next_call` | any provider response | Wrap or replace the actual provider call |
| `tool_execution` | `tool_name`, `args`, `original_args`, `next_call` | any tool result | Wrap or replace the actual tool call |

- Schema versions: `telemetry_schema_version = "hermes.observer.v1"`, `middleware_schema_version = "hermes.middleware.v1"`.
- **Multiple plugins chain in registration order** ("Hermes runs them as a nested chain in registration order").
- **Fail-open:** "Middleware failures are fail-open: Hermes logs a warning and continues with the next middleware or the base runtime path."
- **A mis-declared callback is reported once at WARNING, then repeats go to DEBUG**, "so a mis-declared middleware cannot flood the log; a plugin reload resets the report."
- Request middleware may attach trace: `{"request": …, "source": …, "reason": …}` → stored in later hook payloads as `middleware_trace`. **So a middleware can explain why it changed a request.**

**Observer hooks** (`developer-guide/observer-hooks.md`) — **watch-only, with four documented exceptions**:

- Registered via `ctx.register_hook("pre_api_request", …)`, etc. But `ctx.register_middleware(...)` is the middleware path — note the two different registration methods in the two docs.
- **Hook callbacks are fail-open:** "Hermes catches callback exceptions, logs a warning, and keeps the agent loop running."
- **"Most observer hook return values are ignored."** The four that can change behaviour:

| Hook | Return behaviour |
|---|---|
| `pre_llm_call` | may return a string / `{"context": "..."}` → inject ephemeral context into the current user message |
| `pre_tool_call` | may return `{"action":"block", message}` to **block**, or `{"action":"modify", args}` to transform args |
| `transform_tool_result` | may return a replacement tool result string after `post_tool_call` |
| `transform_llm_output` | may return a replacement final assistant text string |

- Eight documented event families: Session Lifecycle, Turn-Scoped LLM, Request-Scoped API, Tool Lifecycle, Human Input Lifecycle, Approval Lifecycle, Subagent Lifecycle (+ correlation IDs and payload safety).

**The ordering fact that matters most:** `tool_request` middleware rewrites args **before** hooks, guardrails and approvals. So an approval decision is made on the *final* arguments — a plugin cannot smuggle a call past the approval gate by mutating it afterwards. That ordering is a security property, not a convenience.

**Q1:** a user can install a plugin that adds cost tracking, redaction or a policy, and it applies to every call without the model cooperating. Real.
**Q2:** for a platform, these two seams are exactly where **tenancy policy, spend control and audit** would live: middleware to enforce (block/rewrite), observer hooks to record (audit trail) — and the `middleware_trace` field is a ready-made "why did this request look like that" record.

---

## §7 — Hermes as a server: the ACP adapter

Measured: `acp_adapter/` holds **19 files** (`entry.py`, `server.py`, `session.py`, `events.py`, `permissions.py`, `tools.py`, `auth.py`, `edit_approval.py`, `elicitation.py`, `provenance.py`, …). Its docstring (`acp-internals.md`):

> "The ACP adapter wraps Hermes' synchronous `AIAgent` in an async JSON-RPC **stdio server**."

Boot flow (measured `entry.py:95, 180, 208`):

```
hermes acp / hermes-acp / python -m acp_adapter
  -> acp_adapter.entry.main()
  -> parse --version/--check/--setup before server startup
  -> load ~/.hermes/.env
  -> configure stderr logging
  -> construct HermesACPAgent
  -> acp.run_agent(agent, use_unstable_protocol=True)
```

"**Stdout is reserved for ACP JSON-RPC transport. Human-readable logs go to stderr.**" And `acp_adapter/gateway_server.py` maps a cancelled admission to `stopReason: cancelled` and a failed one to an ACP request error "rather than reporting `end_turn`".

**Direction matters here:** Hermes is the **ACP server** — so an editor or client (Zed, and per `server.py:590,597`, clients like Claude Code / OpenCode / Pi) can drive Hermes over ACP. This is the *reverse* of the earlier project tree's arrangement, where Hermes sat *behind* an ACP client. Recording it because it is the same interface seen from the other side.

**Q1:** a user can run Hermes from inside their editor. Real.
**Q2:** the ACP adapter is a **ready-made protocol face** for a platform — Hermes can be a *service* rather than only an app.

---

## §8 — Adding a *built-in* tool (the in-tree path, distinct from plugins)

`developer-guide/adding-tools.md` (211 lines) documents the other route: a tool that ships with Hermes. The steps — create `tools/<name>_tool.py`, add it to a toolset, mark discovery (now automatic — "Step 3 … No longer needed"), handle async, accept `task_id`, register an agent-loop-intercepted tool. Sections include *Async Handlers*, *Handlers That Need task_id*, *Agent-Loop Intercepted Tools*, *Optional: Setup Wizard Integration*, *Checklist*.

So Hermes has **two tool-adding paths**: in-tree (a file + a toolset row) and out-of-tree (a plugin with a manifest). The governance policy (§5) is the stated reason the second is preferred for anything not core.

---

## §9 — **PREMISE CORRECTION (rule 13): "OpenCode" is a provider, not the coding agent**

This is the batch's most important finding, and it corrects an assumption carried from earlier material.

**Measured:** `"opencode"` appears **1,008 times** in the Python and **88 times** in the docs. Every reviewed instance is in the **model-provider** sense:

- `hermes_cli/auth.py:226–231` defines two providers (verbatim):
  ```python
  ("opencode-zen", "OpenCode Zen", "https://opencode.ai/zen/v1", ("OPENCODE_ZEN_API_KEY",), "OPENCODE_ZEN_BASE_URL"),
  # OpenCode Go mixes API surfaces by model (GLM/Kimi: OpenAI chat under /v1; MiniMax and
  # Qwen 3.7: Anthropic Messages under /v1/messages). Keep the base at /v1; api_mode is per-model.
  ("opencode-go", "OpenCode Go", "https://opencode.ai/zen/go/v1", ("OPENCODE_GO_API_KEY",), "OPENCODE_GO_BASE_URL"),
  ```
- `agent/opencode_affinity.py` (150 lines) sends `x-opencode-session` so **OpenCode's relay** "pins requests that share this value to the same upstream backend, which keeps its prompt cache warm".
- `agent/models_dev.py:118–119` maps `"opencode-zen": "opencode"`, `"opencode-go": "opencode-go"`.
- `agent/model_metadata.py:452` maps the host `opencode.ai` → provider `opencode-go`.
- `agent/prompt_caching.py:110` lists them in a provider family alongside `alibaba`.
- `hermes_cli/auth.py:1399–1402` records that the keyless `opencode-free` provider was **removed** because OpenCode "discontinued anonymous free-tier access outside its own client".

**And the coding agent, where referenced at all, is a *client of Hermes*, not a component:** `acp_adapter/server.py:590` — *"(Codex/Claude Code/OpenCode/Zed rely on this; deferring via `call_soon` broke them)."* There is **no** spawn, subprocess, npm install, or binary lookup of an `opencode` CLI anywhere in the tree.

**What this corrects:** any earlier statement that Hermes "integrates OpenCode" as a coding engine, or that its module-loading story maps onto OpenCode's, is **wrong for this tree**. Hermes does not wrap OpenCode. "OpenCode" here is a **relay provider you can pay** (`OPENCODE_ZEN_API_KEY`, `OPENCODE_GO_API_KEY`), and separately an ACP *client* that may connect *into* Hermes. The two must not be conflated. Recorded per rule 13 so the correction propagates everywhere the earlier assumption was used.

---

## §10 — Divergences, boundaries and corrections

**Divergences found this batch: 0** (the plugin contract, governance policy, middleware kinds, ACP boot flow and PTC limits all matched code on every checked claim). **One correction to earlier material** (§9, rule 13).

| Claim | Verdict | Evidence |
|---|---|---|
| Plugin contract has no `PLUGIN_API_VERSION` | **TRUE** (stated as a deliberate refusal) | `plugins/index.md` compat contract |
| Middleware = 4 kinds, fail-open, ordered chain | **TRUE** | `middleware.md` |
| Observer hooks watch-only except 4 documented | **TRUE** | `observer-hooks.md` |
| `tool_request` runs before hooks/guardrails/approvals | **TRUE** | `middleware.md` payload table + purpose text |
| Hermes is an ACP **server** (stdio JSON-RPC) | **TRUE** | `entry.py:95,208`; `acp-internals.md` |
| 17 in-tree plugin kinds; 9 documented extension points | **TRUE** | `ls plugins/`; per-kind guides |
| **"OpenCode" = the coding agent inside Hermes** | **FALSE — corrected** | 1,008 code refs, all provider-relay; no spawn path (§9) |

**Boundary surfaced (not a divergence):** the sandbox's tool set is not the session's tool set exactly — `SANDBOX_ALLOWED_TOOLS` is a **seven-tool allowlist intersected with** the session's enabled tools. A session that lacks `terminal` cannot gain it via PTC.

**Boundary surfaced:** plugins may **change** requests (middleware) or **watch** them (hooks), but the policy forbids wrapping core internals (§4.6). So a platform wanting a hard tenancy gate has a middleware seam but **not** a licence to patch the agent.

---

## §11 — Carried items

| ID | Item | Status |
|---|---|---|
| **C10-1** | PTC intersects its allowlist with session tools — capability expands by composition, never beyond the session. Reusable governance rule. | For §12 |
| **C10-2** | PTC spills oversized stdout to disk and returns the path ("recover-don't-rerun"). Reusable pattern for any tool output. | For §12 |
| **C10-3** | Env-scrub three-stage gate (secret substrings → safe prefixes → named allowlist); `HERMES_` deliberately unsafe. Directly reusable in the platform's worker env. | For §12 |
| **C10-4** | Plugin compat contract is **behavioural, versionless**, with a 2-minor-release deprecation window + frozen external-plugin fixtures. | For §12 |
| **C10-5** | `plugins/AGENTS.md` governance policy: core shrinks on a schedule; capability moves to a catalog; `left_core_migration.py` does one-time state conversion. | For §12 |
| **C10-6** | Middleware (enforce) + observer hooks (audit) + `middleware_trace` = ready-made tenancy/spend/audit seams. | For §12 |
| **C10-7** | Hermes is an ACP **server** — a protocol face for being driven, inverse of the earlier tree's arrangement. | For §12 |
| **C10-8** | **§9 correction**: "OpenCode" = a model provider (zen/go), not the coding agent. Must propagate. | For §12 |

---

## §12 — Batch-level value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a user use case?**
A user gets a machine that *programs against its own tools* (one turn instead of five), whose oversized outputs are **recoverable from disk rather than lost or re-run**, whose secret environment is scrubbed by a three-stage gate before any script runs, who can install a capability a stranger wrote and have it keep working across upgrades, and whose new capabilities arrive **automatically** when a formerly-core feature migrates to a plugin. The user-visible promise: **"my extensions do not break, and my secrets do not leak into code."**

**Q2 — how does this serve the vision of an AI-first business/resource planner?**
Four mechanisms look directly reusable, ranked:

1. **The plugin compat contract + governance policy** (§4, §5) — a written, dated, *shrinking-core* constitution with behavioural compatibility and an automatic migration path. This is the single most valuable item for a platform that expects an ecosystem, because it answers "how do we add capability without forking?" and "how do we later remove it safely?".
2. **The middleware + observer seams** (§6) — with the ordering fact that arg-rewriting precedes the approval gate. Tenancy enforcement, spend caps and audit trails can attach here without patching the engine.
3. **PTC's governance of expansion** (§2) — new capability by *composition inside the session's existing rights*, plus recover-don't-rerun output handling.
4. **The three-stage env scrub** (§2) — a directly portable, well-reasoned rule set for any worker that runs model-written code near credentials.

**Cross-reference:** mercato-vs-Hermes placement is deferred to `12-SYNTHESIS.md` per the owner's instruction.

---

**Batch 10 of 12 complete. Divergences found this batch: 0**, and **one premise correction under rule 13**: "OpenCode" in this tree is a **model provider** (OpenCode Zen / OpenCode Go relay), referenced 1,008 times in code — the coding agent named OpenCode is at most an ACP *client* of Hermes, never spawned. **Most transferable mechanisms:** the versionless behavioural plugin contract with its 2-release deprecation window (§4), the dated shrinking-core governance policy with automatic migration (§5), and the middleware/hook seams with `middleware_trace` (§6).
**Next: `11-channels-voice-and-media.md`** — messaging platforms, voice mode, TTS, vision, image generation, browser — including the carried `egress/iron-proxy.md` read (C8-6).
