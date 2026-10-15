# Batch 01 — What CrewAI Is: the crew / agent / task model and the control plane

> **Pole:** — (orientation batch; findings are tagged with their pole so the later mapping pass can lift them)
> **Status:** read from `lib/**/*.py` only. No claim below rests on `docs/**/*.mdx`.
> **Tree under study:** `library/architecture/platforms/_extracted/crewAI-main/` (pin: `00-PIN-AND-METHOD.md`).

---

## 0. In plain words — what this thing is

CrewAI is a **Python library for orchestrating a team of AI agents**. You declare the team in code:

- an **agent** — a role ("Senior Researcher"), a goal, a backstory, and a model to think with;
- a **task** — a piece of work with a description and an expected output, assigned to one agent;
- a **crew** — the list of agents + the list of tasks + a **process** (the order they run in).

Then you call `crew.kickoff()` and the library runs the loop: it asks the model what to do, executes any
tool the model asks for, feeds the result back, and repeats until the agent produces a final answer.
CrewAI ships **two ways to organise that work**: a **Crew** (a team working a task list) and a **Flow**
(a graph of steps joined by events). Both are code-first; there is no required server, no required database
and no required UI. That is the whole shape of the product.

Everything below is the evidence for that paragraph.

---

## 1. What was read, and its measured size

Source-only sizes (`lib/<pkg>/src/**/*.py`), measured this session:

| package | `.py` files | lines | bytes |
|---|---:|---:|---:|
| `crewai` (the framework) | 535 | 129,336 | 4,625,458 |
| `crewai-core` (shared core) | 29 | 138,480 | 7,960,420 |
| `crewai-tools` (tool library) | 263 | 27,272 | 979,144 |
| `cli` (the `crewai` command) | 81 | 19,543 | 700,264 |
| `crewai-files` (file handling) | 33 | 8,165 | 251,425 |
| `devtools` | 6 | 3,619 | 121,856 |

Whole tree including tests: **1,411 `.py` files / 492,582 lines**. Docs: **33,251 `.mdx` files** —
i.e. **93% of every file in the tree is documentation**, which is why the pin's rule 1 ("code is the
authority, docs are claims") is not a preference in this study but the only way to avoid reading the same
page 45 times.

**One correction to the obvious reading of that table:** `crewai-core` shows 138,480 lines, but
**134,056 of those lines are a single generated file** — `crewai_core/platform_catalog.py` (7,808,174 B), a
machine-generated catalog of third-party SaaS apps and their tools. Without it, `crewai-core` is
**4,424 lines**. The file says so itself in its header:

```
lib/crewai-core/src/crewai_core/platform_catalog.py:1  """Generated CrewAI Platform application catalog.
...  1. Fetch the latest Platform catalog YAML from crewai-plus/db/clipper.
...  2. Parse the YAML source instead of editing this generated catalog by hand.
```

So the *hand-written* core is small; the bulk is data.

The files this batch leans on:

| file | lines | bytes |
|---|---:|---:|
| `lib/crewai/src/crewai/crew.py` | 2,559 | 97,215 |
| `lib/crewai/src/crewai/task.py` | 1,566 | 60,186 |
| `lib/crewai/src/crewai/agent/core.py` | 2,289 | 88,701 |
| `lib/crewai/src/crewai/llm.py` | 2,779 | 108,701 |
| `lib/crewai/src/crewai/flow/runtime/__init__.py` | 4,051 | 166,791 |
| `lib/crewai/src/crewai/agents/crew_agent_executor.py` | 1,667 | 63,209 |
| `lib/crewai/src/crewai/agents/agent_builder/base_agent.py` | 814 | 32,517 |
| `lib/crewai/src/crewai/experimental/agent_executor.py` | 3,363 | 130,005 |

---

## 2. The public surface — what the library hands you

The top-level package re-exports the model objects (`lib/crewai/src/crewai/__init__.py`):

- `Agent`, `Crew`, `Flow`, `Task` — the four nouns you author with;
- `LLM`, `Process`, `Knowledge`, `RuntimeState`;
- `CrewOutput`, `TaskOutput`, `LiteAgentOutput` — the three result shapes;
- `LLMGuardrail`, `PlanningConfig`, `Memory` (lazy — it pulls `lancedb`, so importing it is opt-in).

**Plain meaning:** the *authoring* vocabulary is four nouns; `Process` is the only knob that changes how
they run; and every run ends in one of three serialisable result objects. That is a deliberately small
public surface over a very large private one — a discipline worth noting for our own SRS.

---

## 3. The execution model, read from code

### 3.1 `Process` — the whole of it

```
lib/crewai/src/crewai/process.py:4   class Process(str, Enum):
lib/crewai/src/crewai/process.py:9       sequential = "sequential"
lib/crewai/src/crewai/process.py:10      hierarchical = "hierarchical"
lib/crewai/src/crewai/process.py:11      # TODO: consensual = 'consensual'
```

**Ten lines.** The entire "how does the team run" vocabulary is **two values**, and the third
(`consensual`) is a comment. `Crew.process` defaults to `sequential` (`crew.py:254`), and
`kickoff()` raises for anything else it does not implement (`crew.py:1060-1062`).

### 3.2 `kickoff()` — the one door in

`Crew.kickoff()` (`crew.py:995`) is the synchronous entry point. In order (verified at the cited lines):

1. `apply_checkpoint(...)` — if resuming, hand off to the restored instance (`crew.py:1013-1015`);
2. **if streaming**, wrap the whole run in a chunk generator and return early (`crew.py:1017-1041`) —
   streaming is implemented by re-entering `kickoff` with `stream=False`;
3. open an OpenTelemetry baggage context carrying `crew_context` (`crew.py:1043-1046`);
4. enter a runtime scope on the event bus, then `begin_execution(tracing=...)` mints a **per-run uuid**
   (`crew.py:1050-1052`) — see §3.5;
5. dispatch to `_run_sequential_process()` or `_run_hierarchical_process()` (`crew.py:1055-1058`);
6. run `after_kickoff_callbacks`, then `_post_kickoff`, then compute usage metrics (`crew.py:1064-1069`);
7. in `finally`: drain memory writes, clear files, detach baggage, `end_execution`, exit the bus scope
   (`crew.py:1087-1094`).

**Every failure path** emits `CrewKickoffFailedEvent` and re-raises (`crew.py:1072-1086`).

### 3.3 The task loop

`_execute_tasks()` (`crew.py:1571`) is the actual loop. For each task it:

- asks `prepare_task_execution` whether to skip (checkpoint replay) (`crew.py:1596-1600`);
- handles a `ConditionalTask` by evaluating its condition and possibly recording a skip
  (`crew.py:1602-1608`);
- **if `task.async_execution`**, submits it as a `Future` and moves on (`crew.py:1610-1619`);
- **otherwise** flushes any pending futures first (`crew.py:1621-1625`), builds the context from prior
  outputs (`crew.py:1627`), calls `task.execute_sync(...)`, appends the output, processes the result and
  stores an execution log (`crew.py:1628-1635`);
- flushes trailing futures, then builds the `CrewOutput` from the collected `TaskOutput`s
  (`crew.py:1637-1640`).

**Plain meaning:** *sequential* is a `for` loop with an **inline asynchronous escape hatch**. That is the
entire concurrency story for a Crew — there is no scheduler, no worker pool of its own.

### 3.4 Hierarchical = one extra agent, nothing more

`_run_hierarchical_process()` (`crew.py:1526`) does exactly one thing before running the same loop:
it calls `_create_manager_agent()` (`crew.py:1528`). That method (`crew.py:1531`) either takes your
supplied `manager_agent` — and **refuses one that has tools** (`crew.py:1535-1542`) — or builds a default
manager `Agent` whose tools are `AgentTools(agents=self.agents).tools()` (`crew.py:1546-1554`).

`AgentTools` (`tools/agent_tools/agent_tools.py:16`) returns exactly **two tools**: `DelegateWorkTool` and
`AskQuestionTool`. Delegation itself (`tools/agent_tools/base_agent_tools.py:46`) resolves a coworker **by
fuzzy role name** and then constructs a fresh `Task` for that agent and executes it
(`base_agent_tools.py:112-120`).

**So "hierarchical" is not a hierarchy.** It is the sequential loop plus a manager agent holding two tools
that let it hand work to named colleagues. There is no depth limit, no reporting tree and no budget
enforcement in this file. That is a real finding for our P3 pole (below).

### 3.5 Per-run identity — the trace spine

`execution.py` is small (259 lines) and worth reading whole. A **per-run uuid** is minted on the kickoff
path — not on the event bus — because bus handlers run on worker threads and cannot publish contextvars
back (`execution.py:9-11`). `begin_execution` creates it only for the **outermost** run; nested kickoffs
inherit it (`execution.py:97-101`). A host that already owns a run id can call `set_execution_uuid` and
`begin_execution` will not overwrite it (`execution.py:12-13`, `70-78`).

**Plain meaning:** CrewAI has a first-class notion of *"this run"*, separate from *"this crew object"* —
and it is designed so an outer system (a server, a queue worker) can supply the identity.

### 3.6 The agent reasoning loop

Inside a task, execution delegates to `agent.execute_task(...)` (`task.py:853`) via `_execute_core`
(`task.py:809`). The agent's executor is `CrewAgentExecutor` (`agents/crew_agent_executor.py:98`) — unless
the newer `experimental/agent_executor.py` (3,363 lines) is selected. The loop (`crew_agent_executor.py:331`)
**branches on capability**:

```
crew_agent_executor.py:340   use_native_tools = (
crew_agent_executor.py:341       hasattr(self.llm, "supports_function_calling")
crew_agent_executor.py:344       and self.original_tools
...:347   if use_native_tools: return self._invoke_loop_native_tools()
...:350   return self._invoke_loop_react()
```

- **`_invoke_loop_native_tools()`** (`:505`) — the model returns structured tool calls; the loop executes
  them and feeds results back.
- **`_invoke_loop_react()`** (`:352`) — the classic text pattern: tool definitions are embedded in the
  prompt, the model emits `Action / Action Input` text, which is parsed and executed
  (`:414-450`).

Both share the same guards: a max-iteration check (`:365-373`), an RPM limiter (`:375`), context-window
handling (`:468-477`) and a `finally: self.iterations += 1` (`:480-481`).

**This is the single most important architectural fact in the batch:** *tool-calling is an optimisation on
top of a text-reasoning loop, not the loop itself.* A model without function calling still drives the same
agent, only through prompt-parsed text. Our platform inherits this for free if we keep the loop
model-agnostic.

### 3.7 Task output, guardrails and the step hooks

`_execute_core` (`task.py:809`) also shows the **extension points**:

- a **pre-step hook** dispatch with `StepContext(kind="task", ...)` (`task.py:838-850`) and a matching
  **post-step hook** (`task.py:910-920`);
- **guardrails** — a list of validator functions run in order, then a single guardrail
  (`task.py:892-908`), each able to retry up to `guardrail_max_retries` (default 3, `task.py:279-281`);
- `task.callback` and the crew-wide `task_callback` both fire after the output is set (`task.py:925-939`);
- `output_file` writes the result to disk (`task.py:941-951`);
- `TaskStartedEvent` / `TaskCompletedEvent` / `TaskFailedEvent` are emitted around all of it
  (`task.py:834`, `952-955`, `958-962`).

Guardrails accept **either a function or a natural-language description** (`task.py:252-273`) — i.e. an
LLM-judged guardrail is a first-class option, not a bolted-on library.

---

## 4. The control plane

### 4.1 The event bus is the observability spine

`events/event_bus.py` defines `CrewAIEventsBus` (`:95`) — a **singleton** (`:132`) with:

- **sync handlers on a 10-worker thread pool** and **async handlers on a dedicated daemon event loop**,
  both lazily started on first emit (`:166-191`);
- **dependency ordering** between handlers (`_handler_dependencies`, `:123`; `Depends[...]`);
- a **runtime scope** and an entity registry (`:318-338`);
- **replay** support (`:673`) — events can be re-emitted, which is what makes checkpoint replay and the
  TUI possible;
- a bounded `flush(timeout=30.0)` (`:734`).

The event vocabulary is **163 event classes** across 20 files; the two largest families are
`a2a_events.py` (32) and `flow_events.py` (20). Every one of the ~120 checkpoint trigger names in
`state/checkpoint_config.py:14-143` is an event name.

**Plain meaning:** "what happened during the run" is a first-class, addressable thing in this framework,
not a log line. The same bus feeds checkpoints, tracing, the TUI and any external listener.

### 4.2 Hooks — a second, coarser interception layer

`hooks/dispatch.py:40` defines `InterceptionPoint` with **10 points**: execution start/input/output/end;
pre/post model call; pre/post tool call; pre/post step. Hooks are registered **globally**
(`register`, `:119`) or **scoped to one execution** (`scoped_hooks`, `:159`; `register_scoped`, `:177`),
and a hook may **abort** the intercepted operation by raising `HookAborted` (`:75`).

**Contrast worth carrying forward:** the event bus is *after-the-fact notification*; hooks are
*before-the-fact interception* with the power to block. Both exist, and both are model-agnostic.

### 4.3 The CLI — the nearest thing to a product surface

`lib/cli/src/crewai_cli/` (~55 modules) is the operational shell:
`create_crew.py`, `create_flow.py`, `run_crew.py`, `train_crew.py`, `evaluate_crew.py`,
`kickoff_flow.py`, `replay_from_task.py`, `reset_memories_command.py`, `checkpoint_cli.py` +
`checkpoint_tui.py`, `memory_tui.py`, `crew_run_tui.py`, `crew_chat.py`, `plot_flow.py`, plus
`deploy/` (`main.py`, `validate.py`, `archive.py`) and `authentication/`, `organization/`, `triggers/`.

`crew_run_tui.py` (129,891 B) and `checkpoint_tui.py` are **text UIs** — the closest CrewAI comes to an
end-user interface, and they are terminal-only.

### 4.4 Persistence and checkpointing

`state/checkpoint_config.py` defines `CheckpointConfig` (`:160`): a `location` (default
`./.checkpoints`), a **list of events that trigger a write** (default `["task_completed"]`, `["*"]` for
every event), a pluggable **provider** (`JsonProvider` default, `SqliteProvider` option, discriminated on
`provider_type`), a `max_checkpoints` retention, and a `restore_from` path.
`Crew.from_checkpoint` (`crew.py:432`) and `Crew.fork(...)` (`crew.py:457`, with a `branch` argument)
rebuild a runnable object from stored state; `_restore_runtime` (`crew.py:481`) and
`_rebind_memory_views` (`crew.py:543`) repair the private attributes that are not serialised.

**Plain meaning:** a run is **checkpointable and forkable** — you can snapshot mid-run, resume, or branch
a run into two. For our P3 pole (automations that must survive a restart) this is the single most
reusable idea in the batch.

### 4.5 Declarative definition — the flow contract

`project/crew_loader.py` loads a `Crew` from a **JSON/JSONC definition file** (`load_crew`, `:25`), and
`flow/flow_definition.py` defines a fully serialisable `FlowDefinition` (`:714`) with **17 component
models**: state (dict / pydantic / json-schema / unknown), config, persistence, human-feedback, and
**eight action kinds** — code, tool, crew, agent, expression, script, each-step, each-action — plus
`FlowMethodDefinition`.

**Plain meaning:** the whole graph can be written as **data**, not only as Python. A crew or flow
authored in code and one loaded from a file produce the same runtime object.

---

## 5. The second paradigm — Flows

`Flow` (`flow/flow.py:33`) composes a conversational mixin onto the runtime engine
(`flow/runtime/__init__.py:444`). Authoring is by decorators — `start`, `listen`, `router`, and the
combinators `or_` / `and_` (`flow/dsl/`). A `Flow` is a `BaseModel` with a metaclass (`FlowMeta`, `:391`)
that captures the decorated methods into a definition.

The runtime adds what a Crew does not have: **listener graphs** (`_listener_methods`, `:569`), **routers**
(`_is_router`, `:599`), **racing groups** for `or_` triggers (`_build_racing_groups`, `:1132`;
`_execute_racing_listeners`, `:1205`), **human feedback / suspend-and-resume**
(`from_pending` `:1257`, `resume` `:1345`, `resume_async` `:1398`), **state persistence**
(`_restore_state`, `:1936`; `reload`, `:1964`), and its own `kickoff` / `kickoff_async` (`:2099`, `:2164`).

**Plain meaning:** **Crew = a team given a task list. Flow = a state machine with a ruler.** Both end in
the same event bus, the same hooks and the same checkpoint store. When our automations need branching,
retries, pauses for human approval or durable state, the Flow is the half of CrewAI to study.

---

## 6. Findings, tagged by pole

> Value questions, in the owner's frame: **Q1** = would a *user* of our platform want this? **Q2** = does it
> fit *our vision*? Every row is a capability CrewAI actually ships, read from code.

| # | Finding (capability) | Pole | What it is, in plain words | Q1 | Q2 |
|---|---|---|---|---|---|
| 1.1 | **Four-noun authoring model** | P1 / P3 | You build from Agent · Task · Crew · Flow only; the surface is deliberately tiny and everything else is configuration. | yes | yes |
| 1.2 | **Text reasoning loop with native tool-calling as an optimisation** | P1 | The agent works by asking the model what to do and parsing the reply; tool-calling is a faster path when the model supports it, never a requirement. | yes | yes |
| 1.3 | **Two processes, one loop** | P3 | "Hierarchical" is the same loop plus a manager agent holding delegate/ask tools — not a real hierarchy. | partial | partial |
| 1.4 | **Per-run identity separate from the object** | P3 / P2 | Every run has its own id, minted on the kickoff path, and an outer host may supply it. | no (invisible) | **yes** |
| 1.5 | **Event bus as the observability spine** | P3 / PX-F | 163 typed events on a singleton bus with dependency-ordered, sync + async handlers, and replay. | yes | yes |
| 1.6 | **Hooks that can block** | P3 / P1 | A second interception layer (10 points) where a registered hook may abort the operation. | partial | yes |
| 1.7 | **Checkpoint, resume and fork** | P3 | A run can be snapshotted on chosen events, resumed later, or branched into two. | yes | **yes** |
| 1.8 | **Fully declarative crew/flow definition** | P2 / P3 | The same graph can be loaded from JSON/YAML instead of Python code. | partial | yes |
| 1.9 | **Guardrails that may be functions *or* descriptions** | P1 / P3 | Output validation is pluggable, retries up to N, and can be an LLM judgement rather than code. | yes | yes |
| 1.10 | **Async execution as an inline escape hatch** | P3 | A task can be marked async; the loop then keeps going and collects the result later. | partial | yes |
| 1.11 | **Skills with progressive disclosure** | P1 / P2 | `SKILL.md` files discoverable from disk or a registry, loaded in three levels (metadata → instructions → resources). | yes | **yes** |
| 1.12 | **Dual identity + fingerprint for auditing** | PZ | Every agent has a human-readable id and a `Fingerprint` uuid, with bounded metadata. | no | yes |
| 1.13 | **CLI + terminal UIs, no web UI** | PX-F | The product surface is a command line and text dashboards; there is no in-tree browser UI. | no | noted |
| 1.14 | **Streaming implemented as re-entry** | PX-F / P1 | Streaming output is the same run, re-entered with a chunk generator in front. | yes | yes |

**Reading the table:** two rows carry the most weight for us. **1.4** (per-run identity) and **1.7**
(checkpoint/resume/fork) are the two things our automations pole cannot be built well without, and both
are isolated, small, and copyable in idea. **1.3** is the load-bearing negative: if we ever want real
hierarchies (an AI company's org chart), CrewAI's own "hierarchical" process is **not** the thing to copy —
it is one agent with two delegation tools.

---

## 7. Doc-vs-code divergences recorded

The pin's rule 6 requires the disagreement be written down, not smoothed over.

1. **"Hierarchical" is under-sold by its own name.** Code (`crew.py:1531-1556`) shows a manager agent with
   exactly two tools; there is no depth, budget or reporting structure. A reader of the docs could
   reasonably expect an org chart and would not find one.
2. **`crewai-core` is 97% generated data.** The package reads as a large core library by line count
   (138,480) but is 4,424 hand-written lines plus one generated catalog. Any "CrewAI's core is huge"
   inference from raw counts is wrong.
3. **`Process` has a dead third value.** `consensual` exists only as a comment (`process.py:11`) while
   `kickoff` raises `NotImplementedError` for anything other than the two live values
   (`crew.py:1059-1062`).
4. **`function_calling_llm`, `allow_code_execution`, `multimodal`, `reasoning` are all deprecated in
   code** (`crew.py:294`; `agent/core.py:295-297`, `307-309`, `332-341`) — the framework is actively
   retiring surface area while the docs describe it as current.

---

## 8. Carried forward to the next batch

- **The agent is the next unit of study (Batch 02).** Everything in §3.6 hangs off `Agent`; the class is
  2,289 lines (`agent/core.py`) and its abstract base is 814 lines (`agents/agent_builder/base_agent.py`)
  with **six abstract methods** (`execute_task`, `aexecute_task`, `create_agent_executor`,
  `get_delegation_tools`, `get_platform_tools`, `get_mcp_tools` — `base_agent.py:668-701`). That abstract
  surface is the exact set of things our own aissistant must decide how to do.
- **Two tool sources are already named there** — `get_platform_tools` and `get_mcp_tools`. Our platform's
  MCP bridge (`P2-9a`) and its tool registry are the same two problems; Batch 02 reads how CrewAI solves
  them.
- **Keep the two paradigms separate in later batches.** Crew results flow through `CrewOutput`; flow
  results do not. Do not merge them when mapping.

---

*Batch 01 of 07. Written 2026-10-15. Every line number above is `file:line` in
`library/architecture/platforms/_extracted/crewAI-main/`. Next: `findings/02-the-aissistant.md` (P1).*
