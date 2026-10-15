# Batch 02 — Pole 1: the aissistant

> **Pole:** **P1 — the aissistant.** *The AI user in our platform* (the entity called by `@`, given a role,
> a memory and tools, that does work on a user's behalf).
> **Status:** read from `lib/**/*.py` only. Every claim carries `file:line`.

---

## 0. In plain words — what an "agent" is in CrewAI

An agent is **a job description that can think**. You give it three pieces of text — *who it is* (`role`),
*what it wants* (`goal`), and *the story behind it* (`backstory`) — plus **a list of tools** it may use.
Everything else is optional: which model to think with, how many steps it may take, whether it can ask
colleagues for help, what memories to consult, which documents it can look up, and what to do when a tool
fails.

When it runs, the framework assembles **one big prompt** out of those parts, hands it to the model, reads
back either a tool request or a final answer, and repeats. **The agent has no identity outside the run** —
it is a Pydantic model (a validated data object), not a stored row, not a service.

**What the pole needs and what is missing is the point of this batch.** CrewAI gives us the *shape* of an
aissistant — persona, context assembly, tool sources, failure policy — but it deliberately gives it **no
tenancy, no persistence of the agent itself, and no organisation**. Those gaps are ours to fill.

---

## 1. What was read, and its measured size

| file | lines | bytes |
|---|---:|---:|
| `lib/crewai/src/crewai/agent/core.py` (the `Agent`) | 2,289 | 88,701 |
| `lib/crewai/src/crewai/agents/agent_builder/base_agent.py` (the abstract base) | 814 | 32,517 |
| `lib/crewai/src/crewai/agent/planning_config.py` (`PlanningConfig`) | 152 | 5,825 |
| `lib/crewai/src/crewai/agents/crew_agent_executor.py` (the loop) | 1,667 | 63,209 |
| `lib/crewai/src/crewai/tools/tool_failure.py` (typed failure + policy) | 336 | — |
| `lib/crewai/src/crewai/mcp/tool_resolver.py` + `config.py` + `filters.py` (MCP) | 3 files | — |
| `lib/crewai/src/crewai/tools/agent_tools/*` (delegation) | 6 files | 362 |

---

## 2. The persona — three strings and a model

`BaseAgent` (`agents/agent_builder/base_agent.py:187`) is the abstract contract every agent must satisfy.
The identity fields are exactly three required strings (`base_agent.py:256-258`):

```
base_agent.py:256   role: str = Field(description="Role of the agent")
base_agent.py:257   goal: str = Field(description="Objective of the agent")
base_agent.py:258   backstory: str = Field(description="Backstory of the agent")
```

Plus a stable `id` (a frozen `UUID4`, auto-generated — `base_agent.py:255`) and a `config` dict
(`:259`) that is **excluded from serialisation** (`exclude=True`).

**Plain meaning:** an agent's personality is three strings, and its identity is a uuid the framework
mints. There is **no name field, no avatar, no tenant, no owner, no lifecycle state**. In our platform an
aissistant is a *hired colleague* with a record; here it is a value object.

### 2.1 The knobs (all read from the fields)

| field | line | default | what it does, plainly |
|---|---|---|---|
| `llm` | `base_agent.py:314` | `None` | the model to think with (a string, a config object, or a live LLM) |
| `max_iter` | `base_agent.py:286` | **25** | how many think→act steps before giving up |
| `max_rpm` | `base_agent.py:275` | `None` | a rate limit on model calls per minute |
| `allow_delegation` | `base_agent.py:279` | `False` | may it hand work to colleagues? (off by default) |
| `cache` | `base_agent.py:262` | `True` | whether tool results may be cached — **but caching is opt-in** |
| `tool_failure_policy` | `base_agent.py:289` | `None` (→ `warn`) | what to do when a tool reports failure |
| `max_retry_limit` | `agent/core.py:302` | **2** | retries when the agent errors |
| `respect_context_window` | `agent/core.py:298` | `True` | summarise old messages rather than overflow the model |
| `max_execution_time` | `agent/core.py:258` | `None` | a wall-clock cap on one task |
| `security_config` | `base_agent.py:353` | default | carries the agent's **fingerprint** (audit id) |
| `checkpoint` | `base_agent.py:357` | `None` | whether this agent's state is checkpointed |
| `apps` | `base_agent.py:375` | `None` | **platform tools** — SaaS apps it may act through |
| `mcps` | `base_agent.py:379` | `None` | **MCP servers** — external tool servers it may call |
| `memory` | `base_agent.py:383` | `False` | the agent's own memory store |

**Plain meaning of the two lines that matter most for us:** `apps` and `mcps` are **two separate doors for
external capability**. One is "the vendor's own platform of connected apps"; the other is "any MCP server,
local or remote". They are configured per agent but **carry no tenant or user identity** — see §5.

---

## 3. Context assembly — how one prompt is built

`Agent.execute_task()` (`agent/core.py:957`) is the P1 entry point. It builds the prompt in a **fixed,
readable order** — this is the single most reusable thing in the batch:

```
agent/core.py:978    task_prompt = self._prepare_task_execution(task, context)   # persona + memory
agent/core.py:981    task_prompt = handle_knowledge_retrieval(...)               # knowledge base
agent/core.py:992    task_prompt = self._finalize_task_prompt(task_prompt, tools, task)  # skills + tools
agent/core.py:995    crewai_event_bus.emit(AgentExecutionStartedEvent(...))
agent/core.py:1005   validate_max_execution_time(self.max_execution_time)
agent/core.py:1007   result = self._execute_with_timeout(...)  # or _execute_without_timeout
```

and inside `_prepare_task_execution` (`:678`) the ordering is explicit:

```
agent/core.py:701   task_prompt = task.prompt()
agent/core.py:702   task_prompt = build_task_prompt_with_schema(task, task_prompt)
agent/core.py:703   task_prompt = format_task_with_context(task_prompt, context)
agent/core.py:704   return self._retrieve_memory_context(task, task_prompt)
```

**So the assembly line is: task description → output schema → context from earlier tasks → memory →
knowledge → skills → tools → training data.** Each layer *appends to the same string*. There is no
separate "system prompt object" that survives the call; the prompt is rebuilt for every task.

### 3.1 Memory is a retrieval, not a transcript

`_retrieve_memory_context` (`agent/core.py:757`) is short and worth quoting in full behaviour:

```
agent/core.py:787   if unified_memory is not None:
agent/core.py:788       query = task.description
agent/core.py:789       matches = unified_memory.recall(query, limit=5)
agent/core.py:791       memory = "Relevant memories:\n" + "\n".join(m.format() for m in matches)
agent/core.py:795       task_prompt += I18N_DEFAULT.slice("memory").format(memory=memory)
```

**Plain meaning:** memory enters the prompt as **the top 5 recalled items for the task's own description
text** — not as a conversation history. The framework starts a `MemoryRetrievalStartedEvent`, times it,
and on failure **degrades to no memory** — *unless* the failure was a `HookAborted`, which propagates
(`:819-821`). That last detail is a small but important design rule: *a policy refusal is not a soft
failure.*

**The agent's own memory and the crew's memory are the same object chosen by precedence** — agent first,
crew second (`:784-786`). There is no per-agent isolation of memory beyond whichever store you attach.

---

## 4. Planning — an optional think-first pass

`PlanningConfig` (`agent/planning_config.py:11`) turns on a **plan-before-acting** cycle with **three
effort levels** (`:79`):

- `"low"` — no per-step observation LLM call; a heuristic only;
- `"medium"` (default) — observe each step with the LLM; replan only on failure;
- `"high"` — full observation pipeline: observe every step, then decide/refine/replan, with **early
  goal-achievement detection**.

Other bounds: `max_steps` (20), `max_replans` (3), `max_step_iterations` (15), `step_timeout` (None), and a
**separate `llm` for planning** (`:143`).

**Plain meaning:** "planning" is a **budget dial, not a mode** — and the dial is expressed in *how many
extra model calls* you are willing to pay for. For our platform this is the pattern to copy: reason harder
only where the value justifies the cost, and let the *planning* model differ from the *acting* model.

---

## 5. Tool sources — four doors, and the one our platform needs

`BaseAgent` declares **six abstract methods** (`base_agent.py:668-701`) — the exact contract any agent
implementation must satisfy:

```
base_agent.py:669   def execute_task(...)          # run one task
base_agent.py:678   async def aexecute_task(...)   # the async twin
base_agent.py:687   def create_agent_executor(...) # build the reasoning loop
base_agent.py:691   def get_delegation_tools(...)  # colleague-asking tools
base_agent.py:695   def get_platform_tools(...)    # SaaS-app tools
base_agent.py:699   def get_mcp_tools(...)         # MCP-server tools
```

Four of those six are **about where tools come from**. The `Agent` implementations:

| door | method | how it works |
|---|---|---|
| **Delegation** | `agent/core.py:1358` | wraps every crew-mate as `DelegateWorkTool` + `AskQuestionTool` (`tools/agent_tools/agent_tools.py:22-36`) |
| **Platform apps** | `agent/core.py:1362` | resolves `apps=[...]` selectors via `crewai_tools.CrewaiPlatformTools` (`:1379`) |
| **MCP servers** | `agent/core.py:1398` | delegates to `MCPToolResolver.resolve(mcps)` (`mcp/tool_resolver.py:81`) |
| **Skills** | `agent/core.py:631` | injects a `LoadSkillTool` that reveals more instructions on demand |

### 5.1 The platform-apps door, and the warning that names our own problem

`get_platform_tools` (`agent/core.py:1362`) resolves app selectors and, when a declared app resolves to
**no tools**, emits a `UserWarning` that names **the agent, its apps, and the credential**:

```
agent/core.py:1387   warnings.warn(
agent/core.py:1388       f"Agent '{self.role}' declares apps [{app_names}] but none "
agent/core.py:1389       "resolved to any tools; the agent will run without them and may "
...:1391       "are connected, and that CREWAI_ENTERPRISE_ACTION_AUTH_TOKEN is set."
```

**This is the same failure mode as our open `CC-84`:** a capability is configured for an agent, the
credential that would authorise it is a **single process-wide token**, and when the token is wrong the
agent silently loses its tools. CrewAI's answer is only to *warn louder*. It does not scope the token per
agent, per run, or per tenant.

`get_platform_tools` also **swallows the exception** and logs it (`:1380-1381`), so a hard failure
degrades to "no tools" rather than aborting. That is a deliberate choice, and a debatable one.

### 5.2 The MCP door — three transports, a filter, and a per-server credential

The MCP config models (`mcp/config.py`) are small and complete:

- `MCPServerStdio` (`:12`) — `command`, `args`, `env`, `tool_filter`, `cache_tools_list`;
- `MCPServerHTTP` (`:53`) — `url`, **`headers`**, `streamable`, `tool_filter`;
- `MCPServerSSE` (`:90`) — `url`, `headers`, `tool_filter`.

`MCPToolResolver.resolve` (`mcp/tool_resolver.py:81`) accepts **three flavours of reference**: a typed
config object, an `https://` URL, or a bare AMP slug like `notion` / `notion#search` (`:86-91`). The
resolver **owns the client connections** and must tear them down via `cleanup()` (`:66-69`) — which the
agent does in `_cleanup_mcp_clients` (`agent/core.py:1409`).

**The filter is the interesting part** (`mcp/filters.py`):

```
filters.py:17    class ToolFilterContext(BaseModel):
filters.py:24        agent: Any
filters.py:25        server_name: str
filters.py:26        run_context: dict[str, Any] | None
filters.py:32    ToolFilter = Callable[[ToolFilterContext, dict], bool] | Callable[[dict], bool]
```

with `StaticToolFilter` (allow/block lists; **block beats allow** — `filters.py:82`) and
`create_dynamic_tool_filter` (`:130`) whose docstring example is literally *"block dangerous tools for
Code Reviewers"* (`:150-152`).

**Plain meaning:** CrewAI has a **per-invocation tool-filtering seam** that receives the agent, the
server name and a run context — i.e. **the exact hook where a tenant-scoped toolset would be computed**.
It ships the seam and wires `run_context` through, but the framework itself never populates a tenant into
it. *That is the half-built capability worth taking.*

---

## 6. Failure is typed, and the policy has a precedence chain

`tools/tool_failure.py` is one of the cleanest pieces of the whole tree.

A tool can report failure **with structure** instead of an error string:

```
tool_failure.py:71   class ToolFailure(BaseModel):     # message, reason, code, retryable, details
tool_failure.py:35   class ToolFailureReason(str, Enum):
tool_failure.py:38       TOOL_REPORTED · EXCEPTION · MCP_ERROR · USAGE_LIMIT · UNKNOWN_TOOL · INVALID_INPUT
tool_failure.py:57   class ToolFailurePolicy(str, Enum):
tool_failure.py:60       IGNORE · WARN · RAISE
```

`ToolFailureRecord` (`:111`) adds **where** the failure happened (`tool_name`, `tool_args`, `agent_role`,
`task_name`, `task_id`) and lands on `TaskOutput.tool_failures` **and** the event bus, so *"consumers never
parse a string to learn that a step failed"* (`:114-116`).

The policy is **resolved most-specific-first** (`tool → task → agent → crew → WARN`):

```
tool_failure.py:185   Most specific wins: tool, task, agent, crew, then WARN.
tool_failure.py:192   for source in (tool, original_tool, task, agent, crew):
```

and a malformed policy is ignored with a warning rather than taking down the call (`:201-207`).

**Plain meaning:** this is a **mature, copyable error model**. A failure carries *what*, *where*, *whether
retrying could help*, and *a machine code*; consumers get it as data; and the reaction is a one-word
policy that inherits down a documented chain. **CrewAI and our platform both need this** — and the
`retryable` flag plus the `code` field are exactly what a retrying automation needs.

---

## 7. Identity and audit

`security/fingerprint.py:41` defines `Fingerprint`: a `uuid_str` + `created_at` + a **size-bounded
`metadata` dict** (10 KB max, one level of nesting — `:17-38`). The docstring states the intent plainly:
*"Each agent has dual identifiers: Human-readable ID … and Fingerprint UUID: Unique runtime identifier for
tracking and auditing."*

**Plain meaning:** the *audit identity* is separated from the *authoring identity*. A copy of an agent,
or an agent re-created with the same role, gets a fresh fingerprint. For us, that is the difference
between "the Researcher" (a role) and "this Researcher's run on Tuesday" (an auditable event).

---

## 8. Findings, tagged by pole

| # | Finding (capability) | Pole | Plain words | Q1 | Q2 |
|---|---|---|---|---|---|
| 2.1 | **Persona = role + goal + backstory** | P1 | Identity is three strings; no name/avatar/owner/tenant/lifecycle in the model. | yes | yes |
| 2.2 | **Ordered context assembly** | P1 | One prompt is built in a fixed order: task → schema → context → memory → knowledge → skills → tools. | yes | yes |
| 2.3 | **Memory as top-N recall, not a transcript** | P1 | Memory is *retrieved by the task text* (5 items) and degrades to nothing on failure — unless a hook aborts. | yes | yes |
| 2.4 | **Planning as a budget dial with 3 levels** | P1 / P3 | Think-first pass is optional and priced in extra model calls; the planning model can differ from the acting model. | yes | yes |
| 2.5 | **Four tool doors on one abstract base** | P1 / P2 | Delegation, platform apps, MCP servers and skills are four separate, declared sources. | yes | yes |
| 2.6 | **Per-invocation tool filter with a run context** | P1 / PZ | A seam receives (agent, server, run context) → keep/drop each tool. **The tenant would go here — it is not populated.** | partial | **yes** |
| 2.7 | **Typed tool failures + inherited policy** | P1 / P3 | Failures are structured data with a `retryable` flag and a machine `code`; reaction is one word inherited tool→task→agent→crew. | yes | **yes** |
| 2.8 | **Dual identity (role + fingerprint uuid)** | PZ | Audit identity is separate from authoring identity; metadata is size-bounded. | no | yes |
| 2.9 | **MCP: 3 transports + per-server headers** | P2 / PZ | stdio / streamable-HTTP / SSE, each able to carry its own auth headers. | yes | yes |
| 2.10 | **`max_iter` = 25, `max_retry_limit` = 2, `respect_context_window` = true** | P1 / P3 | The framework ships *default safety bounds*, not "unlimited unless told". | yes | **yes** |
| 2.11 | **Context-window overflow is handled by summarisation** | P1 | Long runs summarise rather than crash. | yes | yes |
| 2.12 | **Agent is a value object, not a record** | P1 / P2 | **The gap:** no persistence, no tenancy, no org, no lifecycle. Ours to build. | — | — |

**Reading the table.** Three rows are the platform-relevant core. **2.6** — the tool filter already takes
a `run_context`, so **a tenant-scoped toolset is a wiring task, not a redesign**; this is the single most
actionable finding for our aissistant. **2.7** — the typed-failure model is mature and directly answers how
an automation should react to a broken tool. **2.12** — the gap is *explicit and useful*: CrewAI has
almost nothing of what our P2 (workspace) and P3 (automations) poles need for agent *identity over time*,
and pretending otherwise would be the sloppy work the owner warned against.

---

## 9. Doc-vs-code divergences recorded

1. **`allow_code_execution` still exists but is a trap.** It is `deprecated=True` (`agent/core.py:293-297`)
   and `get_code_execution_tools` only emits a `DeprecationWarning` pointing at E2B/Modal (`:1422-1430`).
   Code that *looks* like it enables a sandbox does nothing.
2. **`cache=True` is the default on the agent but caching is off.** The field defaults `True`
   (`base_agent.py:262`) yet the docstring and `_setup_agent_executor` (`agent/core.py:552-572`) make clear
   caching only activates on an explicit opt-in. A reader who trusts the default would be wrong about
   behaviour.
3. **`i18n` on the agent is deprecated in favour of a crew-level prompt file** (`base_agent.py:308-311`).
4. **`get_platform_tools` swallows its own errors** (`agent/core.py:1380-1381`) and can leave an agent
   silently toolless while only *warning* (`:1387`). The docstring admits the symptom; the code keeps the
   behaviour.

---

## 10. Carried forward

- **Batch 03 (P2 the workspace)** must ask the question this batch raises: *if an agent is only a value
  object, where does a CrewAI "workspace" live?* The answer is likely `project/`, the CLI, and the
  `crewai-files` package — read those next.
- **Batch 04 (P3 automations)** will take **2.7 (typed failures)** and **2.4 (planning as a budget)** and
  test them against Flow's durability.
- **Mapping note for later (not now):** the tool-filter `run_context` (`2.6`) and the single
  `CREWAI_ENTERPRISE_ACTION_AUTH_TOKEN` (`agent/core.py:1391`) are the two halves of our `CC-84`. Record
  them as a pair; do not resolve them in this study.

---

*Batch 02 of 07. Written 2026-10-15. Every line number is `file:line` in
`library/architecture/platforms/_extracted/crewAI-main/`. No comparison to our platform is made here — the
mapping pass comes later. Next: `findings/03-the-workspace.md` (P2).*
