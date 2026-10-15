# CrewAI forensics — Batch 04: the automations pole (P3)

**Question this batch answers:** does CrewAI have a real notion of *a task arriving and being
scheduled* — an inbox, a queue, a worker, a clock — or is every CrewAI program just *a script you
run*?

**Method rules in force.** Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority
(rule 1). Every claim carries `file:line`. Cite only what was measured. No platform comparison
inside a batch (rule 5). Pole-tag every finding (rule 9). Name every capability (rule 6).

All paths below are relative to
`library/architecture/platforms/_extracted/crewAI-main/` unless stated otherwise. Verified against
`__version__ = "1.15.28"`.

---

## 4.0 The headline, stated up front

**CrewAI has no scheduler, no queue, no worker, and no clock anywhere in its source.** This was
measured by direct search, not inferred:

```
grep -rn "class Scheduler\|class Queue\|class Worker\|celery\|APScheduler\|cron" lib/*/src/ --include="*.py"
```

Every hit is either (a) unrelated prose inside the 7.8 MB generated catalog
(`crewai_core/platform_catalog.py`, which quotes *other* SaaS products' docs and happens to
contain the words "cron" and "scheduled"), or (b) Redis used as a **lock backend** and a **cache
backend** — never as a job broker:

- `lib/crewai-core/src/crewai_core/lock_store.py:3` — *"By default, if `REDIS_URL` is set and the
  `redis` package is installed…"* → this is a **distributed lock**, chosen so two processes don't
  write the same SQLite file twice (`sqlite.py:209` `with store_lock(self._lock_name)`).
- `lib/crewai-files/src/crewai_files/cache/upload_cache.py:113` — `cache_type: Backend type
  ("memory" or "redis")` → an **upload cache**, so a file already uploaded isn't uploaded again.

So: **CrewAI gives you an execution engine and a durability store. It does not give you a place
for work to wait.** What it gives instead is examined below, because the *shape* of what it gives
is exactly what pole 3 needs — it is just missing the delivery layer.

**➜ F4-1 [P3] — No scheduling substrate exists.** There is no queue, no broker, no worker pool, no
cron, no "pending task" table. Work runs when the developer's process calls `kickoff()`. **Plain
meaning:** nothing in CrewAI can decide *on its own* that it is time to run something. A human or
an external system must start the process. **Why it matters for us:** pole 3 (automations) cannot
be delegated to CrewAI at all; it is ours to build. CrewAI contributes the *executor*, not the
*trigger*.

---

## 4.1 The one trigger door, and it is not a door

Batch 03 §3.6 already noted `run_with_trigger`. Read in full, it is smaller than it looks.

`lib/cli/src/crewai_cli/templates/flow/main.py:64-85` — this is the **entire** trigger mechanism:

```python
def run_with_trigger():
    """
    Run the flow with trigger payload.
    """
    import json
    import sys

    if len(sys.argv) < 2:
        raise Exception("No trigger payload provided. Please provide JSON payload as argument.")

    try:
        trigger_payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        raise Exception("Invalid JSON payload provided as argument")

    content_flow = ContentFlow()
    ...
        result = content_flow.kickoff({"crewai_trigger_payload": trigger_payload})
        return result
```

Three facts, each load-bearing:

1. **It is in `templates/`, not in the engine.** The only two definitions of `run_with_trigger`
   in the whole tree are the CLI's two project templates
   (`templates/crew/main.py:66` and `templates/flow/main.py:64`). The *platform* never calls it.
   It is a function the scaffolder *writes into the user's project* for the user to wire up
   themselves.
2. **The payload arrives as `sys.argv[1]`** — a JSON string on the command line, parsed with
   `json.loads` *by the user's own copied code*. There is no HTTP endpoint, no file-watch, no
   message-bus consumer. "Triggered" means "someone ran `python main.py '{"topic":"x"}'`".
3. **The engine's only role is to forward a dict.** The payload reaches the `@start` method
   through a wrapper the runtime installs:

   `flow/runtime/__init__.py:2868-2903` — `_inject_trigger_payload_for_start_method` inspects the
   start method's signature; if it declares a parameter named `crewai_trigger_payload`, the
   runtime pulls the payload out of OpenTelemetry baggage and passes it as that keyword:

   ```python
   accepts_trigger_payload = (
       "crewai_trigger_payload" in inspect.signature(original_method).parameters
   )
   ...
   inputs = cast(dict[str, Any], baggage.get_baggage("flow_inputs") or {})
   trigger_payload = inputs.get("crewai_trigger_payload")
   if trigger_payload is not None and accepts_trigger_payload:
       kwargs["crewai_trigger_payload"] = trigger_payload
   ```

   And if the method does *not* declare it, the payload is silently dropped with a log line
   (`:2883-2886`): *"Trigger payload available but {name} doesn't accept crewai_trigger_payload
   parameter"*. **It is not an error.**

**➜ F4-2 [P3] — "Trigger" is a naming convention, not a subsystem.** `crewai_trigger_payload` is
an ordinary `kickoff(inputs=…)` key whose name the runtime recognises so it can inject it as a
keyword argument into a start method that asks for it. **Plain meaning:** CrewAI documents a
"trigger" pattern, but under the hood it is just: pass a dict into `kickoff`, and name one of its
keys a special string. **Why it matters:** if we adopt this, we are adopting a *convention*. The
actual delivery of the payload (argv, HTTP body, SQS message) is 100 % ours to build. Also note
the failure mode: a start method that forgets the parameter name receives **nothing**, and nothing
tells the caller.

---

## 4.2 Durability: the two independent state systems

Pole 3 is not only "does work arrive" but "does work survive". CrewAI has **two separate and
mutually exclusive** durability systems. They cannot be combined — the engine raises if you try:

`flow/runtime/__init__.py:2128-2133`:

```python
if from_checkpoint is not None and restore_from_state_id is not None:
    raise ValueError(
        "Cannot combine `from_checkpoint` and `restore_from_state_id`. "
        "These parameters target different state systems "
        "(Checkpointing and @persist) and cannot be used together."
    )
```

### 4.2.1 System A — `@persist` / `FlowPersistence`

`flow/persistence/base.py:18` — `class FlowPersistence(BaseModel, ABC)` is the interface; the three
required methods are `init_db` (`:38`), `save_state` (`:48`), `load_state` (`:60`). Two more are
**optional overrides** for the human-feedback case: `save_pending_feedback` (`:70`),
`load_pending_feedback` (`:90`), `clear_pending_feedback` (`:108`). The default base does *not*
store the pending context — it falls back to a plain `save_state` (`:88`) and returns `None` on
load (`:106`). So a backend that doesn't override those **silently cannot resume a paused flow**.

The shipped backend is SQLite: `flow/persistence/sqlite.py:44` `class SQLiteFlowPersistence`. Its
schema is two tables (`:113-138`):

- `flow_states (id, flow_uuid, method_name, timestamp, state_json)` — an **append-only log**: one
  row per completed method. `load_state` reads the newest row for a uuid
  (`:232-241`: `ORDER BY id DESC LIMIT 1`). There is no update and no delete — the only DELETE in
  the file is on `pending_feedback` (`:345-350`).
- `pending_feedback (flow_uuid UNIQUE, context_json, state_json, created_at)` — at most **one**
  pending feedback row per flow (`UNIQUE` at `:133`, `INSERT OR REPLACE` at `:278`).

The DB file defaults to `db_storage_path() / "flow_states.db"` (`:76`), WAL mode (`:110`), 30 s
busy timeout (`:26`). Cross-process safety comes from the lock store, not from SQLite alone
(`:209`, `:267`, `:338`).

A pluggable default is available: `flow/persistence/factory.py:31`
`set_flow_persistence_factory(factory)` — a process-wide one-time setter so `@persist` and the
runtime's pause/resume paths can fall back to *your* backend without passing `persistence=` at
every call site (`:36-42`). Passing `None` restores the SQLite default (`:35`).

### 4.2.2 System B — `CheckpointConfig`

Imported at `flow/runtime/__init__.py:133-137` from `crewai.state.checkpoint_config`
(`CheckpointConfig`, `_coerce_checkpoint`, `apply_checkpoint`) — the **same** checkpoint system the
Crew path uses (Batch 01 §1.4). Applied at the top of both kickoff paths (`:2134`, `:2200`), and if
it restores an instance, the flow re-enters through the restored object's own kickoff (`:2136`,
`:2202`).

`Flow.from_checkpoint` (`:653`) and `Flow.fork` (`:703`) sit under this system, mirroring
`Crew.from_checkpoint` / `Crew.fork` (Batch 01).

**➜ F4-3 [P3] — Two durability systems that refuse to work together.** `@persist` (append-only
per-method rows in a flow-state DB) and `Checkpointing` (a whole-run snapshot) are separate
mechanisms with separate identifiers, and the engine explicitly rejects using both. **Plain
meaning:** you must choose *in advance* which kind of "remember where we were" you want, and the
two memories are not the same shape. **Why it matters:** if our automations need both "resume a
single paused step" and "snapshot and fork a whole run", CrewAI is not a model for how to unify
them — it is a model of two things that were built at different times and kept apart.

### 4.2.3 The pause/resume mechanism, read in full

This is the *only* place CrewAI has anything resembling "work waits for an event". It is worth
reading precisely because it is the closest analogue to pole 3 and it shows what is missing.

`flow/runtime/__init__.py:1256-1326` — `from_pending`:

```python
@classmethod
def from_pending(cls, flow_id, persistence=None, *, definition=None, **kwargs) -> Flow[Any]:
    ...
    loaded = persistence.load_pending_feedback(flow_id)
    if loaded is None:
        raise ValueError(f"No pending feedback found for flow_id: {flow_id}")
    state_data, pending_context = loaded
    ...
    instance._pending_feedback_context = pending_context
    instance._is_execution_resuming = True
```

`flow/runtime/__init__.py:1345-1396` — `resume`:

```python
def resume(self, feedback: str = "") -> Any:
    """..."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop is not None:
        raise RuntimeError(
            "resume() cannot be called from within an async context. "
            "Use 'await flow.resume_async(feedback)' instead."
        )
    return asyncio.run(self.resume_async(feedback))
```

And the docstring at `:1369-1383` names the intended integration pattern explicitly:

```python
# In a sync webhook handler:
def handle_feedback(flow_id: str, feedback: str):
    flow = MyFlow.from_pending(flow_id)
    result = flow.resume(feedback)
    return result
```

**➜ F4-4 [P3] — The one "wait for an external event" primitive is a *pause you resume by hand*.**
A flow reaches a feedback point, an entire `pending_feedback` row is written keyed by `flow_id`,
the process exits; later, *some other process* calls `from_pending(flow_id).resume(text)` and the
flow continues. **Plain meaning:** the work genuinely survives the process ending, and the thing
that restarts it is *whatever code the developer writes around it* — CrewAI's own docstring
suggests a webhook handler. **Why it matters:** CrewAI has the **durability** half of pole 3 and
none of the **delivery** half. There is no retry, no backoff, no visibility timeout, no
"who is responsible for this pending row", no expiry. A pending flow that nobody resumes stays
pending forever, silently. This is precisely the gap our platform must fill.

### 4.2.4 The two "ask" doors are different, and one is not durable

There are two ways a flow can wait for a human, and they behave differently:

1. **`ask()`** — `flow/runtime/__init__.py:3480-3485`. The docstring is explicit: *"Blocks the
   current thread until the user provides input or the timeout expires… Before waiting for input,
   the current `self.state` is automatically checkpointed to persistence (if configured) for
   durability."* But look at what it actually is: it emits a `FlowInputRequestedEvent`
   (`:3548-3557`), calls `self._checkpoint_state_for_ask()` (`:3559`), then **blocks the calling
   thread** on a `ThreadPoolExecutor` future with a `TimeoutError` import at `:3534-3537`. The
   earlier part of the docstring says the quiet part: *"Note: timeout is best-effort for the
   provider call — `ask()` returns `None` promptly, but the underlying `request_input()` may
   continue running in a background thread until it completes naturally."* Parameters:
   `message`, `timeout`, `metadata` (e.g. `{"user_id": "u123", "channel": "#research"}` at
   `:3527` — the routing hint is metadata the **provider** interprets; the platform does not).
   Returning `None` signals timeout/disconnect/error; returning `""` means the user pressed Enter.

2. **Async human feedback** — the `pending_feedback` row + `from_pending().resume()` path of
   §4.2.3. This one survives process exit.

**➜ F4-5 [P3] — `ask()` blocks a thread; it is not a queue.** It is a synchronous rendezvous with
a timeout, wrapped around a pluggable `InputProvider` (`flow/input_provider.py`, referenced at
`:122` and `:3435` `_resolve_input_provider`). **Plain meaning:** for a short "which of these two
do you prefer?" mid-run, `ask()` is fine. For "this job cannot proceed until a person acts, and
that may take days", you must use the `pending_feedback` path — and you must then own the
resumption. **Why it matters:** the two are easy to confuse in a design doc; they have different
failure modes. The block-a-thread one can leave a `request_input()` running in a background thread
after it has already returned `None`, which is a leaked-work hazard if we copy the pattern.

---

## 4.3 Inside a run: what "assigning a task" actually means in CrewAI

Pole 3's own framing is *"agents work on assigned tasks, assign tasks, etc."* So the question is
what CrewAI's own "assignment" primitive is. There are exactly two, and both are inline.

### 4.3.1 Delegation is an inline function call

The manager (hierarchical process) gets exactly two tools, per Batch 01 §1.2 — and
`DelegateWorkTool` is the assignment primitive. Its whole implementation is three lines of work:

`tools/agent_tools/delegate_work_tool.py:16-30`:

```python
class DelegateWorkTool(BaseAgentTool):
    """Tool for delegating work to coworkers"""

    name: str = "Delegate work to coworker"
    args_schema: type[BaseModel] = DelegateWorkToolSchema

    def _run(self, task: str, context: str, coworker: str | None = None, **kwargs) -> str:
        coworker = self._get_coworker(coworker, **kwargs)
        return self._execute(coworker, task, context)
```

and the schema (`:8-13`) is only `task`, `context`, `coworker` — three strings. Now the engine,
`tools/agent_tools/base_agent_tools.py:46-124`. It matches the coworker by name (case-folded,
whitespace-normalised, quotes stripped — the comment at `:66-71` explains this is because *"less-
powerful LLM's have difficulty producing valid JSON"*), then:

```python
selected_agent = agent[0]
try:
    task_with_assigned_agent = Task(
        description=task,
        agent=selected_agent,
        expected_output=I18N_DEFAULT.slice("manager_request"),
    )
    ...
    return selected_agent.execute_task(task_with_assigned_agent, context)
```

**➜ F4-6 [P3] — Delegation is a synchronous function call on an in-memory, unrecorded `Task`.**
The delegate builds a throwaway `Task` object (no id, not persisted, not in the crew's task list),
calls the other agent's `execute_task` **on the calling thread**, and returns its string. **Plain
meaning:** "assigning a task to a teammate" in CrewAI means the assigner *stops* and *waits* while
the teammate does it, then reads back a sentence. **Why it matters:** this is the opposite of pole
3. There is no handoff, no inbox, no status, no way for the teammate to be busy or absent. If a
design needs "manager dispatches to five employees and tracks them", CrewAI's native delegation is
the wrong shape — which is a *useful negative finding*, because it tells us delegation is
something our platform must own.

### 4.3.2 Concurrency inside a run: `async_execution` + a `Future` list

Within one `Crew` run there *is* real concurrency, but it is a task-list flag, not a schedule.
`crew.py:1592` declares `futures: list[tuple[Task, Future[TaskOutput], int]] = []`, and the
loop at `:1595-1640`:

- `:1610-1619` — if `task.async_execution` is set, the task is started with `task.execute_async(...)`
  and its `Future` is appended; **the loop does not wait**.
- `:1620-1625` — if the task is *sync*, all outstanding futures are drained first
  (`_process_async_tasks`, `:1646-1652`) and then the sync task runs.
- `:1637-1638` — whatever is left is drained at the end.

`Task.async_execution` is a plain optional boolean (`task.py:171`), documented at `:127` as
*"Boolean flag indicating asynchronous task execution."* Related per-task fields exist for
post-completion action but are **not** scheduling: `callback` (`:160`), `output_file` (`:205`,
with a path-traversal / shell-expansion validator at `:500-532`), `human_input` (`:233`),
`context` (the dependency list).

**➜ F4-7 [P3] — "Concurrency" here is a per-task boolean that keeps a `Future` in a list.** It
exists to overlap a few long steps inside one run; it is not a worker pool and it does not survive
the process. **Plain meaning:** you can say "these two steps don't depend on each other, run them
at the same time". You cannot say "run this tomorrow". **Why it matters:** this is a genuinely
useful primitive we may want (declarative intra-run parallelism), and it is cheap — but it must be
clearly separated in our design from *durable* scheduling.

### 4.3.3 A2A: the only networked task handoff

The one place where a task truly leaves the process is A2A (agent-to-agent). This is a large
module — **13,955 lines** across `lib/crewai/src/crewai/a2a/**` — and it is a real protocol
implementation: JSON-RPC / gRPC / HTTP+JSON transports (`a2a/config.py:270-301`
`ServerTransportConfig` with `preferred` defaulting to `"JSONRPC"` at `:285`), agent cards with JWS
signing (`:73-131` `AgentCardSigningConfig`, RS/ES/PS algorithms at `:60-70`), a full server config
(`:552-687` `A2AServerConfig`) and client config (`:465-541` `A2AClientConfig`).

What matters for pole 3 is how a remote task's progress comes back. `a2a/updates/base.py` defines
the contract: `UpdateHandler` (`:126-149`, a `Protocol` with one static
`execute(client, message, new_messages, agent_card, **kwargs)`), and three concrete handlers —
polling, streaming, push-notification. `PushNotificationConfig`
(`a2a/updates/push_notifications/config.py:31-65`) carries `url` (callback URL), `timeout` (default
`300.0`), `interval` (default `2.0`), `result_store`, and an HMAC signature
(`:61-65`, `WebhookSignatureConfig.hmac_sha256` at `:21`).

The task-state vocabulary is the A2A standard's, consumed in
`a2a/task_helpers.py:138` `process_task_state`; the two branches that matter here are
`TaskState.completed` (handled at `:173`, returning a `TaskStateResult` at `:206`) and
`TaskState.input_required`:

```python
if a2a_task.status.state == TaskState.input_required:      # task_helpers.py:213
    if a2a_task.history:
        new_messages.extend(a2a_task.history)
```

A `TaskStateResult` (`:62-70`) carries `status`, `history`, and optionally `result`, `error`,
`agent_card`, `a2a_agent_name` — i.e. the remote task's **state travels with the conversation**.

**➜ F4-8 [PZ → partly P3] — A2A is a real protocol, but it is *federation*, not *scheduling*.**
It lets one agent call another agent over the network and get progress back by polling, streaming,
or webhook — and it has a genuine `input_required` state, which is the protocol-level analogue of
`ask()`. **Plain meaning:** A2A is the "phone line between two agents" standard. **Why it matters:**
it solves the *cross-boundary* case (our platform talking to a third-party agent), which is a
different problem from *our own* automations engine. It is also the one place in CrewAI where a
task has a **state that persists in a conversation** (`context_id`, `task_id`, `history`) — so it
is worth studying in the out-of-pole batch as a *record shape*, not as a scheduler. Do not mistake
it for one: there is no queue behind it either, only a client that polls or waits on a webhook.

---

## 4.4 The Flow as an automation *spec*

Here is where CrewAI is genuinely strong, and where the useful material for pole 3 actually lives.
A `Flow` is not a script — it is a **declared graph with a runtime that walks it**. That
declaration is materialised as data (`flow_definition.py`, Batch 01 §1.1) and the runtime executes
it from that data. Four capabilities are worth naming precisely.

### 4.4.1 Conditions: `or_` / `and_`, and a racing group with first-wins semantics

`flow/dsl/_conditions.py:22` `or_(*triggers)` and `:27` `and_(*triggers)` build conditions;
`@listen(condition)` (`dsl/_listen.py:18`) attaches them; `@start(condition)` (`dsl/_start.py:18`)
can be conditional too.

The interesting part is that `or_` is not merely "any of these" — it **cancels the losers**.
`flow/runtime/__init__.py:1132-1178` `_build_racing_groups` computes, at runtime, which `or_`
alternatives form a *race*, with a careful correctness rule in the comment at `:1135-1140`:

> *"Only events that EXCLUSIVELY feed one OR listener race; an event that also feeds another
> listener (e.g. an AND) is left alone when a sibling wins… Events nested under an `and_()` branch
> (e.g. `or_(and_(a, b), c)`) are not alternatives and never race — cancelling one would make the
> AND unsatisfiable."*

And `:1205-1254` `_execute_racing_listeners` enforces it: racing listeners are launched as
`asyncio.create_task` (`:1224-1230`), then

```python
for coro in asyncio.as_completed(racing_tasks):
    try:
        await coro
    except Exception as e:
        logger.debug(f"Racing listener failed: {e}")
        continue
    break

for task in racing_tasks:
    if not task.done():
        task.cancel()
```

**➜ F4-9 [P3] — `or_` has first-wins semantics with loser cancellation, and the cancellation rule
is subtle and correct.** **Plain meaning:** "whichever of these two finishes first wins, and we
stop the other one" — but *only* when the loser isn't also needed by an `and` elsewhere.
**Why it matters:** this is a genuinely non-obvious semantic we would otherwise get wrong. If our
automation graph ever has alternatives, this is the reference implementation of the rule, including
the pitfall (cancelling a member of an `and` makes it unsatisfiable forever). Note the swallow at
`:1244-1246`: a racing listener that *throws* is `logger.debug`-ed and skipped, and the loop moves
to the next — so a failing alternative does not abort the race.

### 4.4.2 A method-completion graph, not a timeline

`_find_triggered_methods` (`:3306`) and the conditions machinery operate on **sets of completed
method names** (`_condition_satisfied(condition, events)` at `:184`; `_iter_condition_events` at
`:243`). A flow's progress is therefore *"which method names have fired"*, and listeners fire when
their condition over that set becomes true.

**➜ F4-10 [P3] — Progress is tracked as a set of completed names, not a clock or a cursor.**
**Plain meaning:** the engine doesn't say "we are on step 3"; it says "these steps have finished,
so these steps may now run". **Why it matters:** this is a *durable-friendly* representation — a
set of completed names is exactly what you can write to a row and reload — which is why
`pending_feedback` (§4.2.3) can reconstruct a flow in a fresh process. It is also the reason
CrewAI needs no scheduler: a "trigger" is just another method name whose completion satisfies a
condition. **This is the single most reusable idea in the batch for pole 3.**

### 4.4.3 Replay, and the honest limits of it

`flow/runtime/__init__.py:2777` `_replay_recorded_events`, plus `kickoff_async`'s
`restore_from_state_id` parameter (`:2164-2189`), which hydrates a new run's state from a
previously persisted flow while assigning a **fresh** `state.id` so the new run's `@persist`
writes land under a separate key (`:2116-2123`, `:2183-2189`). On the Crew side there is a
corresponding `replay` (`crew.py:2101`) and `train` (`:943`) / `test` (`:2299`).

**➜ F4-11 [P3] — Replay exists, but it is state-hydration, not deterministic re-execution.**
**Plain meaning:** you can start a new run *seeded with* a finished run's state — useful for
branching and for "try that again with a change" — but the point is the *fresh id*, so history is
preserved rather than overwritten. **Why it matters:** do not plan on replay for audits; plan on it
for forks. The append-only `flow_states` log (§4.2.1) is the actual audit trail, and it records
*completed methods with their state*, not inputs and outputs of LLM calls.

### 4.4.4 The graph is drawable — and it is a real HTML artefact

`flow/runtime/__init__.py:4002` `plot(filename="crewai_flow.html", show=True)` →
`build_flow_structure(...)` → `render_interactive(...)`. The renderer is
`flow/visualization/renderers/interactive.py` (466 lines): a Jinja2 environment
(`:397-400`, `FileSystemLoader`, `select_autoescape(["html","xml","css","js"])`) loading
`interactive_flow.html.j2` (`:440`) plus `style.css` (`:413`) and `interactive.js` (`:423`) from
`flow/visualization/assets/` — **confirmed present** at
`lib/crewai/src/crewai/flow/visualization/assets/interactive_flow.html.j2`; it writes the rendered
HTML at `:461` and emits a `FlowPlotEvent` (`:4011-4017`).

**➜ F4-12 [PX-W/PX-F] — The automation graph renders to a self-contained HTML file with CSS+JS.**
**Plain meaning:** a CrewAI Flow can draw itself as an interactive picture of the graph.
**Why it matters:** this is real evidence for the widget/frontend pole (batch 05), and it is
*spec-driven* — the picture is built from the same `FlowDefinition` data the engine executes
(`builder.py`, 343 lines), so the diagram cannot drift from the code. That property — *one
definition, executed and drawn* — is worth carrying forward.

---

## 4.5 Divergences found in this batch (doc-vs-code)

Per method rule 1 and rule 13: record them, do not paper over them.

| # | Claim (as it reads) | Measured reality | Verdict |
|---|---|---|---|
| **D4-1** | `ask()` blocks until the user provides input. | It returns on timeout, disconnect, or provider error, returning `None`; and the underlying `request_input()` "may continue running in a background thread" after `ask()` returns (`runtime/__init__.py:3504-3510`). | Doc-self-corrected; the *short* claim is the misleading one. |
| **D4-2** | A "trigger" starts a flow. | The trigger is a `sys.argv[1]` JSON string parsed by user template code (`templates/*/main.py`); the engine only forwards a dict key named `crewai_trigger_payload` into a start method that declares it (`runtime/__init__.py:2868-2903`). | Engine supports the *convention*; the *trigger* is entirely the user's. |
| **D4-3** | The two state systems are alternatives. | They are, and the engine *enforces* the exclusivity with a `ValueError` rather than documenting it (`runtime/__init__.py:2128-2133`, `:2194-2199`). | Behaviour is correct and explicit; the exclusivity is a real constraint to design around. |
| **D4-4** | A pending flow will be resumed. | Nothing resumes it. `from_pending` raises `ValueError` if no row exists (`:1306-1307`); the caller — a webhook handler in the docstring's own example (`:1372-1375`) — is app-supplied. There is no retry, expiry, or ownership record. | The most important gap in the pole. |

---

## 4.6 Gap statement — what pole 3 needs that CrewAI does not give

Stated plainly, because a batch that only lists features is useless for the mapping pass. For
*automations* — agents working on assigned tasks, assigning tasks — CrewAI supplies:

| Need (pole 3) | CrewAI's offering | Verdict |
|---|---|---|
| A place for work to wait | none — no queue, no broker, no table of pending work | **absent** |
| A clock / schedule | none — no scheduler, no cron in source | **absent** |
| A worker that picks up work | `kickoff()` — a developer-called process entry | **absent** |
| Survive process exit mid-run | `@persist` per-method rows; `CheckpointConfig`; `pending_feedback` row | **present, two incompatible systems** |
| Resume from outside the process | `from_pending(flow_id).resume(text)` | **present, but nobody drives it** |
| Run steps in parallel inside one run | `Task.async_execution` + a `Future` list | **present (intra-run only)** |
| Trigger by payload | a `kickoff(inputs=…)` dict key + a naming convention | **nominal** |
| Conditional graph with alternatives | `or_` / `and_` with first-wins cancellation | **present, genuinely good** |
| Progress representation | a set of completed method names | **present, reusable** |
| Visualise the automation | `flow.plot()` → self-contained HTML from the same definition | **present** |
| Assign a task to a teammate | an inline `execute_task` call on a throwaway `Task` | **wrong shape** |
| Cross-boundary task handoff | A2A with polling/streaming/webhook + `input_required` | **present (federation, not scheduling)** |
| Retry / backoff / expiry / ownership | none | **absent** |
| Tenancy / who owns this run | none observed in this batch (see F4-9→ re-check in batch 06) | **to confirm** |

The single sentence for the SRS: **CrewAI is an excellent *executor* of a declared workflow and a
credible *durability* store, and it has no *delivery* layer at all.** Pole 3 is therefore split:
the part that is "what does the work graph look like and how does a run remember where it was"
maps onto CrewAI well; the part that is "how does work arrive, who is responsible for it, and what
happens when nobody acts" is entirely ours.

---

## 4.7 Batch 04 — checklist

- [x] Read from `lib/**/*.py` only; no `.mdx` used as authority.
- [x] Every claim carries `file:line`; all citations re-verified with `sed -n`/`grep -n` at write time.
- [x] No platform comparison inside the batch (rule 5).
- [x] Every finding pole-tagged (rule 9); every capability named (rule 6).
- [x] Two value questions carried forward to the synthesis batch (rule 4).
- [x] Divergences recorded rather than smoothed (rule 13).
- [x] Retirement rule honoured: nothing was deleted to fit a narrative (C13-14).
- [x] 12 findings: F4-1…F4-12 (F4-9/F4-10/F4-11/F4-12 mixed-tagged where the evidence straddles a pole).

**Batch 05 (PX-W widgets / PX-F frontend)** takes the one artefact this batch found —
`flow.plot()`'s self-contained HTML renderer (§4.4.4) — and asks the retargeted question: what
else in CrewAI is a *user interface*? The working expectation, to be tested rather than assumed, is
that there is no in-tree web UI, and that the interface surface is the docs-site construction, the
CLI's terminal output/`rich` panels, the `a2ui` A2A extension, and this visualization renderer.
