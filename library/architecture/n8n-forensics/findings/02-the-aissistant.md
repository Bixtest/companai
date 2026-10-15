# Batch 02 — The Aissistant (P1)

**Study:** n8n `2.44.0` · **Batch:** 02 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code (§ batch 00)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.

---

## 0. What this batch had to answer

P1 is **the aissistant** — what an agent *is* here, how it is configured, what it can do, and how it is
kept safe. Batch 01 found the platform. This batch opens the agent up.

Short answer, measured:

| Question | n8n's answer | Where |
|---|---|---|
| What is the AI surface? | **`@n8n/agents` v0.29.0** — *"AI agent SDK for n8n's code-first execution engine"* — 133 runtime files, 42 SDK files, 40 workspace files | F02-01 |
| What is an agent? | A **fluent builder** (`Agent`) with 25+ configuration methods, lazy-built; *"user code never calls `.build()`"* | F02-02 |
| What is a skill? | **A `SKILL.md` file**, validated, with a **72 KB cap**, content-addressed linked files, and an optional **MCP server dependency** | F02-03 |
| Can agents delegate? | **Yes — with suspend and resume**, a max-children limit, and a difficulty field | F02-04 |
| How is it kept safe? | **Guardrails** (`allow` or `stop` with a code) run **before a model call and before a tool call**; tool output is treated as **untrusted**, stripped of invisible Unicode and wrapped with its source | F02-05/06 |
| How is it kept affordable? | A **budget guardrail** with a **spend ledger**, a per-session cost cap and a monthly budget | F02-07 |
| What models can it use? | A catalog **fetched from `models.dev`**, carrying per-million-token cost and context limits, with provider aliases | F02-08 |

---

## 1. The AI surface, measured

`packages/@n8n/agents` — **v0.29.0**, described as *"AI agent SDK for n8n's code-first execution
engine"* (`package.json`).

| Directory | Files | What it is |
|---|---:|---|
| **`runtime/`** | **133** | the running agent: loop, state, streaming, model, memory, mcp, tools, guardrails, telemetry, skills |
| `__tests__/` | 372 | — |
| **`sdk/`** | **42** | the fluent builders and entry points |
| **`workspace/`** | **40** | the agent's workspace |
| **`types/`** | **26** | public types (sdk / runtime / telemetry) |
| `evals/` | 11 | evaluation primitives |
| **`skills/`** | **7** | the skill contract, validator, registry, prompt |
| `utils/` | 6 | — |
| `vector-stores/` | 4 | vector store integration |
| `storage/`, `integrations/` | 2 / 1 | — |

**The AI packages in the monorepo** (`packages/@n8n/`): `agents`, `ai-node-sdk`, `ai-utilities`,
**`ai-workflow-builder.ee`** (unlicensed), `instance-ai`, `nodes-langchain`, `mcp-apps`, `mcp-browser`,
`mcp-browser-extension`.

**Note on `ai-node-sdk`:** it holds **one file** (`index.ts`) — a barrel. It is the public re-export
surface, not the implementation. Named here so a later reader does not mistake a 1-file package for a
1-file feature.

---

## 2. What an agent is: a fluent builder, and a rule about it

`src/sdk/agent.ts` defines `class Agent`, and the package's own `AGENTS.md` states the design rule:

> *"**Builder pattern with lazy build** — all public primitives use a fluent builder API. **User code
> never calls `.build()`.** Builders are passed directly to the consuming method (e.g. `agent.tool(myTool)`)
> which calls `.build()` internally. `Agent` has `generate()`/`stream()` directly on the class, which
> lazy-build via `ensureBuilt()` on first call. `build()` is **`protected`** on `Agent` to keep it out of
> the public API."*

And a second rule: *"**Zod for schemas** — all input/output schemas use Zod."*

**The configuration surface (measured, 25+ methods)** — each one a capability:

| Method | What it adds |
|---|---|
| `model(providerOrIdOrConfig, modelName?)` · `modelFetch(fetch)` | the model, or a custom fetch |
| `instructions(text, options?)` | the system prompt |
| **`volatileInstructionsProvider(provider)`** | instructions supplied **at runtime**, per call |
| `tool(t)` · **`deferredTool(t, options)`** | tools, and tools **loaded on demand** |
| **`skills(sourceOrSkills)`** | a skill source |
| `providerTool(builtProviderTool)` | provider-defined tools |
| `memory(m)` · `memoryTaskObserver(observer)` | memory, and an observer on memory tasks |
| `fileStore(store)` · `vectorStore(...)` | a file store, a vector store |
| **`middleware(m)`** | middleware |
| **`inputGuardrail(g)` · `outputGuardrail(g)`** | guardrails on input and output |
| **`eval(e)`** | evaluations |
| **`checkpoint(storage)`** | checkpointing (`'memory'` or a store) |
| `structuredOutput(schema)` | a Zod or JSONSchema7 output contract |
| `reasoning(level)` | a reasoning level |
| **`promptCaching(config)`** | prompt caching |
| `telemetry(t)` · `toolCallConcurrency(n)` | telemetry, concurrency |
| `generate(...)` (line 774) · `stream(...)` (line 789) | the two entry points |

**➜ F02-01 [foundational] — An n8n agent is a **configuration object with a lazy build**, not a class
you subclass.** **Plain meaning:** you *describe* an agent — its model, its instructions, its tools, its
skills, its guardrails, its memory — and calling `generate()` or `stream()` builds it on first use.
**Why it matters:** the agent is **data**, and the builder is the only API; there is no inheritance
hierarchy to learn or to fork.

**The runtime that runs it** (`src/runtime/`, 133 files) is organised by concern:
`loop/` (the agent loop, `agent-runtime`), `state/` (`event-bus`, `run-state`), `streaming/`, `model/`,
`memory/`, `mcp/`, `tools/`, `guardrails/`, `telemetry/`, `skills/`.

---

## 3. Skills — a `SKILL.md` contract with real teeth

`src/skills/types.ts` is the contract, and it is more specific than "a prompt file":

```ts
export const RUNTIME_SKILL_FILE_NAME = 'SKILL.md';
/** Maximum UTF-8 bytes of instruction or linked-file content before truncation. */
export const RUNTIME_SKILL_MAX_OUTPUT_BYTES = 72 * 1024;
export const SKILL_LOAD_TOOL_NAME = 'load_skill';
export const RUNTIME_SKILL_LINKED_FILE_GROUPS =
  ['references', 'templates', 'scripts', 'assets', 'examples'];
```

| Type | What it carries |
|---|---|
| `RuntimeSkillLinkedFile` | `{ path, bytes, sha256 }` — **content-addressed** linked files |
| `RuntimeSkillIndexEntry` | `{ name, description, recommendedTools? }` — an index that can **recommend tools** |
| `RuntimeSkillInterfaceContract` | `{ displayName, shortDescription, defaultPrompt, icon, brandColor }` — **a UI contract** |
| `RuntimeSkillPolicyContract` | `{ allowImplicitInvocation?, product? }` — **a policy**: may it be invoked without being named? |
| `RuntimeSkillMcpServerDependency` | `{ name, description?, transport?, url? }` — **a skill can require an MCP server** |
| `RuntimeSkillRegistry` | a registry with `RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION = 1` |

And the package provides `parseRuntimeSkillMarkdown`, `RUNTIME_SKILL_NAME_PATTERN` and
`validateRuntimeSkill` — so **a skill is parsed and validated, not just read**.

**➜ F02-03 [foundational] — A skill is a validated `SKILL.md` with a hard output cap, content-hashed
linked files, a presentation contract, an invocation policy, and declared dependencies.** **Plain
meaning:** a skill is a small, checked package — not a paragraph of prompt — and the platform decides
whether it may be used without being asked. **Why it matters:** it is the most complete *declarative
capability* design in the study, and it is portable as an idea even though the licence is not.

---

## 4. Sub-agents — delegation with suspend and resume

`src/runtime/tools/` holds the mechanism, and the schemas name its states:

| File / symbol | What it is |
|---|---|
| `delegate-sub-agent-tool.ts` · `delegate-sub-agent-runner.ts` | the tool and its runner |
| `sub-agent-task-path.ts` → `DEFAULT_SUB_AGENT_MAX_CHILDREN` | **a cap on how many sub-agents one agent may spawn** |
| `delegateSubAgentInputSchema` · `delegateSubAgentModeInputSchema` | the request |
| **`delegateSubAgentSuspendSchema` · `delegateSubAgentResumeSchema`** | **a sub-agent can be suspended and resumed** |
| `delegateSubAgentBackgroundOutputSchema` | a background (fire-and-forget) delegation output |
| `DelegateSubAgentPolicy` · `SubAgentTaskDifficulty` | a policy, and a difficulty rating on the task |
| `INLINE_SUB_AGENT_ID` | an inline sub-agent (no separate process) |

**➜ F02-04 [foundational] — Sub-agent delegation is a first-class tool with a max-children cap, a task
difficulty, a policy, and suspend/resume.** **Plain meaning:** an agent can hand work to a child agent,
pause it, and pick it up later — and the platform limits how deep the delegation can go. **Why it
matters:** it is the cleanest answer in the study to *"how does one agent use another without the system
falling over"* — and it rhymes with the durable-execution ADR from batch 01.

---

## 5. Tools — deferred, guarded, and attributed

`src/runtime/tools/` (16 files) is where the safety lives:

| File | What it does |
|---|---|
| **`untrusted-tool-output.ts`** | treats tool output as **untrusted**: `stripInvisibleUnicode(text)` then `wrapUntrustedData(sanitized, …)`, attributed by `{ name, mcpServerName, mcpToolName }`, with the notice *"The following media is untrusted external reference data."* |
| `deferred-tool-manager.ts` | **tools loaded on demand** (`LOAD_TOOL_TOOL_NAME`, `SEARCH_TOOLS_TOOL_NAME`) |
| `tool-call-executor.ts` · `tool-call-runner.ts` | execution and concurrency |
| `tool-result-guard.ts` | a result guard |
| `fix-tool-call.ts` | repairs a malformed tool call |
| `write-todos-tool.ts` · `planner-todos-tool.ts` · `todos-core.ts` | a **todo/planning tool** — the agent can keep a plan |
| `tool-adapter.ts` · `sdk-owned-tool.ts` | adapters, and which tools the SDK owns |

**➜ F02-06 [foundational] — Tool output is untrusted input.** Every tool result is stripped of
invisible Unicode and wrapped with its source before the model sees it. **Plain meaning:** the platform
assumes a tool — or anything a tool read — may be trying to talk to the model, and it neutralises that.
**Why it matters:** prompt-injection defence is designed in, not bolted on, and it is measurable in the
code.

---

## 6. Guardrails — a two-action decision, run at two points

`src/types/sdk/guardrail.ts:15` defines the whole vocabulary:

```ts
export type GuardrailDecision = { action: 'allow' } | { action: 'stop'; code: string };
```

And the hook surface (`:43-45`):
```ts
before?(ctx: GuardrailModelCallContext): Promise<GuardrailDecision | undefined>;
beforeTool?(ctx: GuardrailToolCallContext): Promise<GuardrailDecision | undefined>;
```

**➜ F02-05 [foundational] — A guardrail is a function that can veto a model call or a tool call, and its
only answers are *allow* or *stop with a code*.** **Plain meaning:** there is exactly one interception
contract, and it is applied at the two places an agent can spend money or touch the world. **Why it
matters:** a one-decision vocabulary is what makes a policy enforceable; a richer one becomes a
negotiation.

### 6.1 The budget guardrail — spend as a first-class concern

`src/runtime/guardrails/budget-guardrail.ts` defines:
- **`SpendLedger`** — `add(callId, entries)` (***"idempotent on `callId`"***), `read(key)`;
- `SpendEntry { key, usd }`, `SpendTotal { key, totalUsd, previousUsd }`;
- `BudgetGuardrailOptions` — `sessionCostCapUsd`, **`monthlyBudgetUsd`**, plus `sessionId`/`agentId`.

**➜ F02-07 [foundational] — Cost is a guardrail, not a report.** An agent can be capped **per session and
per month**, and the ledger that enforces it is idempotent per call. **Plain meaning:** the same contract
that stops a dangerous tool also stops an expensive one. **Why it matters:** for a platform whose users
pay for tokens, "stop" is the only durable answer to overspend.

---

## 7. Memory — an observation log with a reflector

`src/runtime/memory/` (17 files) is a real subsystem, not a message buffer:

| File | What it is |
|---|---|
| `episodic-memory.ts` · `episodic-memory-capture.ts` | episodic memory and its capture |
| **`observation-log-observer.ts` · `observation-log-reflector.ts`** | **an observer and a *reflector*** — memory is consolidated, not just stored |
| `observation-log-renderer.ts` · `observation-log-store.ts` · `observation-log-defaults.ts` | how it is rendered, stored and defaulted |
| `memory-orchestrator.ts` · `memory-lifecycle.ts` · `memory-store.ts` | orchestration, lifecycle, store |
| `scoped-memory-task-runner.ts` | memory tasks, scoped |
| `tool-result-memory.ts` | remembering tool results |
| `title-generation.ts` | generating titles (for memory entries) |
| `strip-orphaned-tool-messages.ts` | cleaning up orphaned tool messages |

**➜ F02-09 [foundational] — Memory is an *observation log with a reflector*.** **Plain meaning:** the
agent observes, and something periodically **reflects** on what it observed and consolidates it — the
same shape as a human sleep cycle. **Why it matters:** it is a designed answer to "how does an agent
remember without its context growing forever", and it is absent from the other platforms studied.

---

## 8. MCP — one client, lazily connected

`src/sdk/mcp-client.ts`:
> *"Manages connections to one or more MCP servers and exposes their tools as a **flat list of
> `BuiltTool`** instances. Connections are established **lazily on the first `listTools()` call** and kept
> alive until `close()`. Both operations **deduplicate concurrent calls** via stored promises, so calling
> `listTools()` from multiple concurrent `generate()` runs is safe."*

**And a skill can require an MCP server** (§3), so the two systems compose.

---

## 9. Model flexibility — a catalog fetched from models.dev

`src/sdk/catalog.ts`:
- **`MODELS_DEV_URL = 'https://models.dev/api.json'`** — the catalog is **fetched from an external
  service**, not hard-coded;
- `MODELS_DEV_PROVIDER_ALIASES` — `amazon-bedrock` → `aws-bedrock`, `azure`/`azure-cognitive-services` →
  `azure-openai` (so n8n's names are normalised against the catalog's);
- **`ModelCost`** — `{ input, output, cacheRead?, cacheWrite? }` **USD per million tokens**;
- **`ModelLimits`** — `{ context?, output? }` — the context window and the output cap;
- `getModelCost(...)` is imported by the agent builder — **so cost data flows straight into the budget
  guardrail** (§6.1).

`src/runtime/model/` holds the per-provider handling: `google-vertex.ts`, `openai-api-style.ts`,
`provider-credentials.ts`, **`provider-quirks.ts`** (a quirks layer), `lazy-ai.ts`, `prompt-cache.ts`,
`model-token-counter.ts`, `model-factory.ts`.

**➜ F02-08 [foundational] — Model choice is data, fetched at runtime, and it carries price and limits.**
**Plain meaning:** the agent asks a catalogue what a model costs and how much context it has, and the
budget guardrail uses that to decide whether to stop. **Why it matters:** "no lock-in" becomes
measurable rather than a slogan, and cost-awareness is wired into the same decision path as safety.

---

## 10. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F02-01** | **An agent is a configuration object with a lazy build** — a fluent `Agent` builder with 25+ methods; *"user code never calls `.build()`"*; `build()` is `protected`. | P1 | You describe an agent; you do not inherit one. | The agent is data, and the builder is the only API. |
| **F02-02** | **A 133-file runtime organised by concern** — loop, state, streaming, model, memory, mcp, tools, guardrails, telemetry, skills. | P1 | (indirect) — the agent is thorough. | A runtime you can read one concern at a time. |
| **F02-03** | **A skill is a validated `SKILL.md`** — 72 KB output cap, content-hashed linked files, a UI contract, an invocation policy, declared MCP dependencies, a schema-versioned registry. | P1 | Skills are small, checked packages. | The most complete declarative-capability design in the study. |
| **F02-04** | **Sub-agent delegation with suspend/resume**, a max-children cap, a difficulty rating and a policy. | P1 | One agent can use another, safely and reversibly. | A designed answer to agent-to-agent work. |
| **F02-05** | **A guardrail is `allow` or `stop(code)`, run before a model call and before a tool call.** | P1/PZ | One interception contract at the two places that matter. | A one-decision vocabulary makes a policy enforceable. |
| **F02-06** | **Tool output is untrusted input** — invisible Unicode stripped, wrapped with its source (`mcp:server` / tool name). | P1/PZ | Prompt injection is defended against by default. | Safety designed in, and measurable. |
| **F02-07** | **Cost is a guardrail** — a `SpendLedger` idempotent per `callId`, a per-session cap and a monthly budget. | P1 | Overspend stops instead of reporting. | The stop path serves money as well as safety. |
| **F02-08** | **Model choice is fetched data** — a catalog from `models.dev` carrying USD-per-million-token cost and context limits, with provider aliases. | P1 | Switching model costs nothing but a string. | "No lock-in" becomes measurable, and cost feeds the guardrail. |
| **F02-09** | **Memory is an observation log with a reflector** (plus capture, orchestration, lifecycle, scoped tasks, title generation). | P1 | The agent remembers without its context growing forever. | A designed consolidation cycle. |
| **F02-10** | **An MCP client that connects lazily, deduplicates, and exposes MCP tools as ordinary tools.** | P1 | MCP servers plug in with no special handling. | One tool list regardless of where a tool came from. |
| **F02-11** | **Tools are deferred** (`LOAD_TOOL` / `SEARCH_TOOLS`) — a large toolset does not have to be in the prompt. | P1 | Many tools without a huge context. | Tool discovery as a designed capability. |
| **F02-12** | **The agent can keep a plan** — `write-todos-tool`, `planner-todos-tool`, `todos-core`. | P1 | Long tasks stay on track. | Planning as a built-in tool, not a prompt trick. |
| **F02-13** | **`ai-node-sdk` is a 1-file barrel**, not a 1-file feature (recorded so it is not misread). | PZ | (indirect) | Named per rule 6. |

---

## 11. Divergences and honest bounds

- **No doc-vs-code divergence was needed.** The package's own `AGENTS.md` describes conventions that the
  code follows (lazy build, Zod schemas, no `_` prefixes) — the best case for rule 1, and it is worth
  saying so plainly rather than inventing a divergence.
- **Bound:** this batch read the **agent SDK and its runtime** — the builder, the runtime's concern
  split, skills, sub-agents, tools, guardrails, memory, MCP and the model catalog. It did **not** read
  the 372 test files, the 40-file `workspace/` directory, or `nodes-langchain` (the node-level LangChain
  integration); those are named rather than half-covered.
- **Bound:** `evals/` (11 files) is **named** as a capability and not analysed — the evaluation
  primitives are batch 04/07's subject.
- **Bound (stated plainly):** the guardrail's `before`/`beforeTool` hooks are read from the **type
  definitions**; the guardrail runner's execution order is not claimed here.

---

## 12. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **The skill contract (F02-03)** — `SKILL.md`, validated, capped, content-hashed, with a policy and
   declared dependencies. The most portable declarative-capability design in the study.
2. **The two guardrail primitives (F02-05 / F02-07)** — `allow` or `stop(code)`, before a model call or
   a tool call, with spend as a first-class reason to stop.
3. **Untrusted tool output (F02-06)** — strip, wrap, attribute. A small, complete, measurable defence.
4. **Sub-agent delegation with suspend/resume and a max-children cap (F02-04)** — agent-to-agent work
   with a designed limit.

All four are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 02 of 07. Read from source on 2026-10-15. Next: `findings/03-the-workspace.md`.*
