# The model server — how Companai runs models, and where llama.cpp fits

**Status: DESIGN, NOT BUILT.** Written 2026-10-05. No code, no deployment and no runtime was
changed to produce it. Every claim below was read from the source or the deployment file on
2026-10-05, or is marked as reasoning.

**What this is.** The integration decision for the **model layer**: how Companai calls hosted
models over an API (OpenAI, DeepSeek, and the rest), how it runs open-weight models on its own
hardware, and where **llama.cpp** sits in that picture. It is the companion to
[`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md): that document settled
who reasons; this one settles what they reason on.

**What it rests on**, in order of authority:

1. **The product's own plan**: `library/ai/ai-first/03_Local_First_AI_Runtime_and_User_Function_Architecture.md`
   (the vision: a `ModelRuntime` abstraction, a `Model Broker / Policy Layer`, llama.cpp as the
   primary local engine), plus [`ARCHITECTURE.md`](ARCHITECTURE.md), [`BLOCKERS.md`](BLOCKERS.md),
   [`BACKLOG.md`](BACKLOG.md).
2. **The measured source**: `workspace/starting-kit` (our platform) and `hermes-agent-main` (the
   Hermes snapshot). **Where a document and the code disagree, the code wins.**
3. **The prior analysis**: the eight documents in `llama/` (evidence cut-off 2026-10-05). This
   document **adopts its recommendation, corrects its central assumption, and supplies two defects
   it did not find.**

---

## 0. The short version

**The `llama/` analysis reached the right conclusion from the wrong starting point.**

Its recommendation is: *"Choose product-native model management with an external managed inference
process."* That is correct and this document keeps it.

But it was written by reading documents, and it assumed the control plane would have to be built.
Its Phase 0 says: *"do not assume the ideal Broker already exists in code."* **Measured: it does.**
The platform already ships a model factory, a provider registry, eleven OpenAI-compatible presets,
a tenant model allowlist, per-agent overrides and token metering. So the recommendation is right and
**the work is far smaller than the analysis implies.**

The consequence is the headline of this document:

> **llama.cpp is one preset entry, not a project.** The preset file's own header states the design
> goal: *"adding a new backend takes one entry in this array, zero new adapter files, and zero
> changes to route handlers."* llama.cpp satisfies every requirement of that sentence. It is
> missing only the entry.

And two things are **broken today**, neither of which the analysis found:

1. **The model server command has no `--jinja`, and the recorded tool-call failure matches what
   that would cause.** Hermes' own documentation carries a caution block: without it, *"llama-server
   ignores the `tools` parameter entirely"* and tool calls degrade to raw JSON in the message text.
   Our deployment command does not set it. **And the COOKBOOK's Step 4 table records the symptom:**
   a real agent turn in which the model enumerated all 21 tools, chose one, and **nothing reached
   the platform** (the MCP's own log shows no call; the other two checks the COOKBOOK cites are
   structurally NULL for a read-only tool, so only the log is discriminating). **Two caveats, both
   stated:** one study already in this repository reads the flag the other way
   (`library/ai/qwen-hermes-tool-calling-report.md`: *"enabled by default"*), and a model that never
   emits a well-formed call would also produce no MCP log line. **So this is a claim with a
   named test, not a settled defect:** read `chat_template` from `http://model:8080/props`. §4.1
   states it that way.
2. **The MCP service was never given `OPENAI_BASE_URL`.** The embedding lane therefore calls
   `api.openai.com` with the placeholder key `local` and fails with `invalid_api_key` — which is
   **the exact text of the recorded blocker B-16.** The request never reached llama.cpp at all.

---

## 1. What the prior analysis got right, and what it got wrong

### 1.1 Kept unchanged

- **Two axes, not one binary.** *Who owns model management* and *where inference executes* are
  independent questions. Correct, and it is the spine of §3 here.
- **Model management belongs to the product, not to Hermes.** Correct.
- **Inference stays a separate process.** Correct, and §3.2 shows it is already structurally settled.
- **`llama-server` is one replaceable adapter, not the architecture** (its D1). Correct.
- **`llama-server` does not authorize anything** (its D3, D9). Correct.
- **"Local" is not a performance claim** (its D8). Correct, and the measurements in §7 agree.
- **OpenAI-compatible is not spec-equivalent** (its D10). Correct.

### 1.2 Corrected

| The prior analysis said | Measured on 2026-10-05 | Status |
|---|---|---|
| "The product architecture already calls for a provider-neutral `ModelRuntime` abstraction... Treat llama.cpp as one adapter behind that boundary" (implied to be future work) | `packages/ai-assistant/src/modules/ai_assistant/lib/model-factory.ts` is a working **7-tier** resolution chain; `packages/shared/src/lib/ai/llm-provider.ts` is the port; `llm-provider-registry.ts` is the registry; `llm-adapters/{openai,anthropic,google}.ts` are the adapters; `openai-compatible-presets.ts` carries **11 presets** | **ALREADY BUILT, in large part.** The abstraction exists. What is missing is the llama.cpp entry and the embedding seam. |
| "Existing documents show distinct configuration paths; proposed target, not current fact" (its confidence table, row 4: *"Low / not established"*) | The **chat** lane already resolves through one `model-factory.ts`. The tenant allowlist is already an intersection of an env allowlist and a per-tenant DB row | **CORRECTED.** One policy path exists for the chat lane. The *embedding* lane is separate, and it runs through `EmbeddingService`, not the factory. |
| "The recorded local endpoint provides chat but the platform's vector integration expects embeddings" | Two independent defects, and the analysis named only the second. See §6 | **SHARPENED into a measured root cause.** |
| "Tool behaviour depends on the selected model's chat template/parser and exact server version" | True, and **a flag was absent from the deployment and from the development documents as they stood before this change**. Hermes' docs say `--jinja` is required. **But our own prior study reads it the other way** — `library/ai/qwen-hermes-tool-calling-report.md:50`: *"current server documentation has `--jinja` enabled by default"* | **FLAG WAS ABSENT; THE CONFLICT IS NAMED, NOT RESOLVED.** §4.1 gives the one command that settles it |
| "Hermes cannot run a model itself" needs qualification (its own correction) | Confirmed and strengthened. `hermes_cli/local_runtime/` is **19 Python modules plus a JSON catalog (20 files; 4,307 lines of Python)**, with `enabled: False` by default | **CONFIRMED.** See §6.3. |

### 1.3 The premise that actually needed correcting

The analysis's own README says: *"the existing measurements point to CPU prompt-ingest and
generation as a material bottleneck."* True. But it framed the choice as **"native product model
management versus a separate inference service."** Measured, that is not the live choice:

- **A separate inference service is not a choice we are making.** It is already the shape. The
  Sprint 0 stack runs `model` as its own container on the private network, and the platform reaches
  it at `http://model:8080/v1` over HTTP.
- **The platform cannot embed it anyway.** The app is Node 24; llama.cpp is C++. The same argument
  that settled B-05 settles this one: the language boundary decides it, and the boundary is already
  crossed.

So the real question is narrower, and more useful: **how does the product own the model layer
without duplicating the control plane it already has?** That is what §4 answers.

---

## 2. What already exists — measured, from the code

Read on 2026-10-05 from `workspace/starting-kit` at HEAD `fc96340`. **21 packages.** `@open-mercato/ai-assistant`
is version **0.6.7**.

### 2.1 The chat lane — a real control plane

| Piece | File | What it does |
|---|---|---|
| The port | `packages/shared/src/lib/ai/llm-provider.ts` | `LlmProvider` — `id`, `name`, `envKeys`, `defaultModel`, `defaultModels`, `isConfigured`, `resolveApiKey`, `getConfiguredEnvKey`, `createModel`. **Chat only: there is no `embed` method.** |
| The registry | `packages/shared/src/lib/ai/llm-provider-registry.ts` | `resolveFirstConfigured({ env, order })`, `get(id)`, `list()` |
| The adapters | `lib/llm-adapters/{openai,anthropic,google}.ts` | **Protocols, not vendors.** The OpenAI adapter serves every OpenAI-compatible backend |
| The presets | `lib/openai-compatible-presets.ts` | **11 presets**: OpenAI, DeepInfra, Groq, Together, Fireworks, Azure, LiteLLM, Ollama, OpenRouter, Requesty, LM Studio |
| The factory | `lib/model-factory.ts` | The **7-tier** resolution chain, plus allowlist enforcement and fallback |
| The allowlist | `lib/model-allowlist.ts` | `OM_AI_AVAILABLE_PROVIDERS` / `OM_AI_AVAILABLE_MODELS_<PROVIDER>`, intersected with a per-tenant snapshot |

**The resolution chain, in order** (measured from `model-factory.ts`):

```
1. requestOverride    (HTTP query params ?provider= ?model= ?baseUrl=)   -- gated by allowRuntimeOverride
2. callerOverride     (programmatic, e.g. runAiAgentText({ modelOverride }))
3. tenantOverride     (the ai_agent_runtime_overrides DB row)            -- gated by allowRuntimeOverride
4. module env         OM_AI_<MODULE>_MODEL
5. agent default      AiAgentDefinition.defaultModel
6. global env         OM_AI_MODEL   (OPENCODE_MODEL kept as a BC fallback)
7. provider default   provider.defaultModel
```

**And the guardrails that already exist.** The `generated/entities/` directory holds **10** AI
entities; the six below are the ones that govern the model layer (the other four are chat
conversations, participants, messages and pending actions):

| Entity | What it governs |
|---|---|
| `ai_tenant_model_allowlist` | Which provider/model pairs a tenant may use |
| `ai_agent_runtime_override` | A per-tenant runtime/model/baseURL override |
| `ai_agent_prompt_override` | A per-agent prompt override |
| `ai_agent_mutation_policy_override` | A per-agent mutation policy |
| `ai_token_usage_event` | Per-event token usage |
| `ai_token_usage_daily` | Rolled-up daily token usage |

**This is the finding that changes the size of the job.** The vision asks for a *Model Registry*, a
*Model Broker / Policy Layer*, per-tenant model policy and cost visibility. **Four of those five
already have a working implementation**, and the fifth (the registry as a first-class object) is
half-there in `defaultModels` plus the DB entities.

### 2.2 The embedding lane — a second, separate, closed lane

This is the one place the platform is *not* provider-neutral. Read from
`packages/search/src/vector/types.ts` and `services/embedding.ts`:

| Fact | Value |
|---|---|
| The provider union | `EmbeddingProviderId = 'openai' \| 'google' \| 'mistral' \| 'cohere' \| 'bedrock' \| 'ollama'` — **closed, 6 values** |
| The catalog | `EMBEDDING_PROVIDERS` — name, `envKeyRequired`, `defaultModel`, `models[]` with dimensions |
| The default | `DEFAULT_EMBEDDING_CONFIG = { providerId: 'openai', model: 'text-embedding-3-small', dimension: 1536 }` |
| The config shape | `EmbeddingProviderConfig` — `providerId`, `model`, `dimension`, `outputDimensionality?`, **`baseUrl?`**, `updatedAt` |
| The clients | Per-provider, hardcoded: `createOpenAI`, `createGoogleGenerativeAI`, `createMistral`, `createCohere`, `createAmazonBedrock`, `createOllama` |
| The vector drivers | `chromadb`, `pgvector`, `qdrant` |
| The change detection | `detectConfigChange()` — a provider/model/dimension change sets `requiresReindex` |

**Two asymmetries matter, and both are load-bearing for §6:**

1. **The chat lane is preset-driven; the embedding lane is a closed union.** There is no
   "OpenAI-compatible, custom base URL" embedding provider. Ollama is the only local one, and it
   speaks Ollama's native API through `ai-sdk-ollama`, not OpenAI's.
2. **The `openai` embedding client ignores `config.baseUrl`.** Measured at
   `services/embedding.ts:127-133`: `createOpenAI({ apiKey })`. The `baseUrl` field on the config
   type is read for **`ollama` only** (line 173). This matters because of §6.2.

### 2.3 The deployment — what Sprint 0 actually runs

From `workspace/starting-kit/docker-compose.fullapp.yml`:

| Service | Image | Model wiring it receives |
|---|---|---|
| `opencode` | built | `OM_AI_PROVIDER`, `OM_AI_MODEL`, **`OPENAI_BASE_URL`**, `OPENAI_API_KEY` |
| `mcp` | `open-mercato/app` | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` — **and no `OPENAI_BASE_URL`** |
| `app` | built | `OM_AI_PROVIDER`, `OM_AI_MODEL`, **`OPENAI_BASE_URL`**, `OPENAI_API_KEY` |
| `model` | `ghcr.io/ggml-org/llama.cpp:server` | `-m /models/<file>`, `-c 65536`, YaRN (`--rope-scaling yarn --rope-scale 2 --yarn-orig-ctx 32768`), `-n 512`, `-t 4`, `-tb 8` |
| `hermes` | `nousresearch/hermes-agent:latest` | `command: ["gateway", "run"]`, named volume, no model env (configured by Hermes' own CLI) |

**Read the `mcp` row again.** It is the only service with an AI key and no base URL, and it is the
service that builds the tool-search index. That is §6.2.

---

## 3. The decision

### 3.1 The two axes

| Axis | Option A | Option B | **Our recommendation** |
|---|---|---|---|
| **Who owns model management?** | Hermes' profile manages engines and models | Companai owns the catalog, policy, lifecycle, limits and status | **Companai** — and the pieces already exist (§2.1). Hermes' managed mode stays for standalone desktop use |
| **Where does inference execute?** | Embedded in the app or the agent process | A separate `llama-server` process/container | **Separate** — and it is not a new decision; the language boundary already forced it (§1.3) |

### 3.2 Why "separate" is already settled, not chosen here

The same four-route argument that decided B-05 applies verbatim:

1. The app is **Node 24**; llama.cpp is **C++**. There is no in-process option short of a native addon.
2. Sprint 0 **already runs** `model` as its own container, reached over HTTP at `model:8080/v1`.
3. The platform's own code treats it as a **base URL**, not a library: `OPENAI_BASE_URL`.
4. The vision itself puts a **`ModelRuntime` abstraction** between the app and the engine.

So this document does **not** re-open "embedded versus separate". It records that the answer is
already in the deployment, and spends its effort on what is genuinely open.

### 3.3 The three things this document decides

These are **our calls**, and they are cheap to overrule:

1. **The chat lane gets a `llamacpp` preset** — one data entry in `openai-compatible-presets.ts`,
   mirroring `ollama` and `lm-studio`. Not the `openai` provider pointed sideways with
   `OPENAI_BASE_URL`.
2. **The model server gets `--jinja`** — a one-line change to the `model` service command.
3. **The embedding lane gets a way to be pointed at a local OpenAI-compatible server**, and the
   `mcp` service gets `OPENAI_BASE_URL` — the two halves of B-16.

### 3.4 The one thing this document does not decide

**What the long-term default should be: all-local, cloud-first with local fallback, or
policy-per-tenant.** That is a product and cost decision, it is the owner's, and §9 states it as a
recommendation with the trade in plain words. It is **not** closed here.

---

## 4. The concrete integration — four changes

Every change below is small. That is the point: the analysis implied a programme; the measurement
says four edits.

### 4.1 Add `--jinja` to the model service

**Why.** Hermes' `website/docs/integrations/providers.md` carries this caution, quoted exactly:

> **`--jinja` is required for tool calling.** Without `--jinja`, llama-server ignores the `tools`
> parameter entirely. The model will try to call tools by writing JSON in its response text, but
> Hermes won't recognize it as a tool call — you'll see raw JSON like `{"name": "web_search", ...}`
> printed as a message instead of an actual search.

Its troubleshooting table repeats it: *"**llama.cpp** | Add `--jinja` to the startup command"*.

**What we measured, with the scope and the tense stated exactly.** **Before this change**, `--jinja`
was absent from the deployment and from the development documents: not in
`docker-compose.fullapp.yml`, not in `docker-compose.fullapp.dev.yml`, not in
`packages/create-app/template/docker-compose.fullapp.yml`, not in `workspace/COOKBOOK.md`, and not
anywhere in `library/development/`.

**This change is what adds it** — to the COOKBOOK's `model` service block (step 3.2), to
`RUNBOOK-sprint0.md` and to `BACKLOG.md`. **So read that sentence as a statement about the tree as it
stood, not about the tree now.** The documents you are reading are the ones that carry the fix, and a
search today will find the flag in them.

**It is *not* absent from the repository, and saying so would be wrong.** The string appears in the
prior study material, for example `library/ai/qwen-hermes-tool-calling-report.md` (five places,
including a worked command) and `library/ai/hermes-docs/reboot/work/R6-LLAMA-SERVER-SSOT-REVIEW.md:33`.
It also appears in Hermes' own source, for example
`hermes-agent-main/hermes_cli/local_runtime/supervisor.py:188`.

**And that study contradicts us on the substance.** Its line 50 reads:

> *"Its function-calling documentation says OpenAI-style function calling is provided through the
> Jinja chat mechanism; current server documentation has `--jinja` enabled by default…"*

So there are two readings and they cannot both be right: **Hermes says the flag is required; our own
prior study says it is now the default.** This document does not resolve that by argument.

**The resolution is a measurement.** The running server publishes the answer:

```bash
curl -s http://model:8080/props | jq '.chat_template'
```

- **A template comes back** → `--jinja` behaviour is active (whether by default or by flag). Tool
  calling is *capable*, and this section is **NOT AN ISSUE**. Close it with the reading recorded.
- **`null` comes back** → the server has no chat template, the `tools` parameter is being ignored,
  and the one-line change below is required.

**Why we still recommend adding the flag regardless.** It is free, it is explicit, and it removes a
dependency on a build default that differs between llama.cpp versions. An explicit flag is the
difference between a configuration and an assumption. **But the defect claim is unproven until
someone runs the `curl`**, and this document records it that way.

**What the record actually says, and it is stronger than "unproven".** There **was** a real agent
turn, and the COOKBOOK's Step 4 table records its outcome in detail:

- `hermes mcp test mercato` → *✓ Connected*, *✓ Tools discovered: 21*.
- In the turn, the model **enumerated all 21 tools by name** and then *"picked the wrong tool
  (`meta_describe_agent`, which needs an `agentId`) and never called `context_whoami`"*.
- **Nothing reached the platform.** The COOKBOOK cites *"three checks"* — `api_keys.last_used_at`
  NULL, `action_logs` unchanged, no MCP log line. **But the same cell carries its own ledger caveat,
  and it removes two of the three:** a *read-only* tool writes no `action_logs` row, and the platform
  never records API-key usage, so both are NULL **whether or not a call happened**. **The
  discriminating check is the MCP's own log line, and there is none.** That is the one that counts,
  and the first draft of this document over-counted it as three.
- A **direct authenticated `tools/call`** to `context_whoami` returns **HTTP 200** with real data,
  so the wire and the credentials are sound.

The COOKBOOK reads that as *"the failure is the model's tool choice"*. **The `--jinja` finding
explains the same observation more completely, and one test separates the two readings:**

- **If tool calling worked and the model merely chose badly**, the call to `meta_describe_agent`
  would still have **reached the platform** and failed *there*, on the missing `agentId`. It did not
  reach the platform at all.
- **If the server is ignoring `tools`**, the model's choice is emitted as **text**, Hermes does not
  recognise it as a call, and **nothing reaches the platform** — which is exactly what the one
  discriminating check found.

So the recorded outcome **is consistent with the `--jinja` diagnosis** and is not fully explained by
"the model chose wrong". It is still not proof: a model that never emits a well-formed call would
also produce no MCP log line. **The `props` check is what settles it.**

**The change, if the check says it is needed.** One entry in the `model` service command:

```yaml
      - --jinja
```

**How to verify after the change.** The same `curl`. The `chat_template` field should be present.
Hermes' docs name this exact check.

**Cost.** Zero. It is a server flag.

### 4.2 Add a `llamacpp` preset

**Why.** Today the platform reaches the local server by **relabelling it as OpenAI**:
`OM_AI_PROVIDER=openai` plus `OPENAI_BASE_URL=http://model:8080/v1` (COOKBOOK step 3.3). That works
mechanically, because the `openai` preset declares `baseURLEnvKeys: ['OPENAI_BASE_URL']`. It is also
wrong in three visible ways:

1. The UI model dropdown shows the `openai` preset's catalog — GPT-5 Mini, GPT-5, GPT-4o-mini,
   GPT-4o — while the
   server actually serves Qwen2.5-7B.
2. The provider name shown to an operator is **"OpenAI"** for a machine in their own rack.
3. It is exactly the config drift the `llama/` analysis warns about: one endpoint, two authorities.

**The change.** One entry in `openai-compatible-presets.ts`, mirroring the two local presets already
there:

```ts
const LLAMACPP_PRESET: OpenAICompatiblePreset = {
  id: 'llamacpp',
  name: 'llama.cpp (local)',
  baseURL: 'http://model:8080/v1',
  baseURLEnvKeys: ['LLAMACPP_BASE_URL'],
  envKeys: ['LLAMACPP_API_KEY'],
  defaultModel: '',            // as LM Studio: auto-detect when the server has one model
  defaultModels: [],           // the catalog is deployment-specific, not vendor-curated
}
```

**Why `defaultModel: ''` and `defaultModels: []` follow the existing pattern, not a new one.** The
`LM_STUDIO_PRESET` already does exactly this, and its comment gives the reason: *"LM Studio
auto-detects the loaded model when the request body's `model` field is empty."* A llama.cpp server
serving one GGUF behaves the same way.

**What must be true for the preset to activate.** `isConfigured()` requires a non-empty
`LLAMACPP_API_KEY`. A keyless llama.cpp server therefore needs **any** non-empty placeholder, which
is the same convention the COOKBOOK already uses for `OPENAI_API_KEY=local`. **This is a real sharp
edge and it is recorded, not hidden:** a preset that is invisible until you invent a fake key is a
papercut, and the honest fix is either to document the placeholder or to let a preset declare
`allowsEmptyApiKey`. We recommend documenting it now and revisiting if it bites.

**Cost.** One entry. Zero new adapter files. Zero route changes — which is the preset file's own
stated design.

### 4.3 Give the `mcp` service the base URL

**Why.** §6.2 traces B-16 to this. It is one line of YAML.

**The change.** Add to the `mcp` service `environment:` block, alongside the existing
`OPENAI_API_KEY`:

```yaml
      OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}
```

**Cost.** One line.

### 4.4 Serve an embedding model

**Why.** §6.2. Even with the base URL fixed, llama.cpp cannot produce embeddings from a causal
language model. `Qwen2.5-7B-Instruct` is a chat model; the server will refuse the embeddings call.

**The change.** A **second** `llama-server` instance with an embedding GGUF, on its own port, added
to the private network. The candidates are the ones the platform already knows about, because the
`ollama` entry in `EMBEDDING_PROVIDERS` lists them with dimensions:

| Model | Dimension | Source |
|---|---|---|
| `nomic-embed-text` | 768 | `EMBEDDING_PROVIDERS.ollama.models[0]` |
| `mxbai-embed-large` | 1024 | `EMBEDDING_PROVIDERS.ollama.models[1]` |
| `all-minilm` | 384 | `EMBEDDING_PROVIDERS.ollama.models[2]` |
| `snowflake-arctic-embed` | 1024 | `EMBEDDING_PROVIDERS.ollama.models[3]` |

**The dimension is not a free choice.** `detectConfigChange()` sets `requiresReindex` when the
dimension moves, and `pgvector`'s `recreateWithDimension()` exists precisely because changing an
embedding model is **a data migration**, not a setting. Pick the dimension once, before there is an
index worth keeping.

**The seam is missing, and that is a second change.** Because `EmbeddingProviderId` is a closed
union with no OpenAI-compatible member, pointing the embedding lane at a local llama.cpp server
needs **one new member**, not just a URL. The cheapest correct shape mirrors the chat lane's own
design:

```ts
// in packages/search/src/vector/types.ts
export type EmbeddingProviderId =
  | 'openai' | 'google' | 'mistral' | 'cohere' | 'bedrock' | 'ollama'
  | 'openai-compatible'      // NEW: honours config.baseUrl, speaks /v1/embeddings
```

…with a `case 'openai-compatible'` in `embedding.ts` that does what the `openai` case *should* do:

```ts
client = createOpenAI({ apiKey, baseURL: this.config.baseUrl })
```

**This is also the fix for the asymmetry in §2.2, point 2** — the `openai` client dropping
`config.baseUrl` is at best a latent bug and at worst the reason a future operator cannot point
embeddings at a proxy.

**Cost.** One union member, one switch case, one preset-shaped catalog entry. This is the largest of
the four changes, and it is still small.

---

## 5. The API-provider path — the owner's first ask

**The question:** how does the system call AI models over an API, like OpenAI or DeepSeek?

**The answer: this is already built, and it is broader than the question implies.** Measured from
`openai-compatible-presets.ts` and `llm-adapters/`:

| Provider | Status | How it is reached |
|---|---|---|
| OpenAI | Preset, configured | `OPENAI_API_KEY` |
| Anthropic | Native adapter | `ANTHROPIC_API_KEY` |
| Google | Native adapter | `GOOGLE_GENERATIVE_AI_API_KEY` |
| DeepInfra | Preset | `DEEPINFRA_API_KEY` — carries `deepseek-ai/DeepSeek-V3.2-Exp`, `zai-org/GLM-5.1`, Qwen3 |
| Groq | Preset | `GROQ_API_KEY` |
| Together | Preset | `TOGETHER_API_KEY` |
| Fireworks | Preset | `FIREWORKS_API_KEY` |
| Azure OpenAI | Preset | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` |
| LiteLLM | Preset | `LITELLM_API_KEY` — a self-hosted router for arbitrary upstreams |
| OpenRouter | Preset | `OPENROUTER_API_KEY` |
| Requesty | Preset | `REQUESTY_API_KEY` |
| Ollama | Preset (local) | `OLLAMA_API_KEY`, base URL overridable |
| LM Studio | Preset (local) | `LM_STUDIO_API_KEY`, base URL overridable |

**So "call OpenAI, DeepSeek, etc. over an API" needs no new architecture.** DeepSeek-the-*model* is
reachable today through DeepInfra or OpenRouter. DeepSeek-the-*provider* (its own endpoint at
`api.deepseek.com`) needs **one preset entry**, exactly like §4.2 — which is the same one-line shape
for every provider not already listed.

**The four governance properties that come free with it**, all measured in §2.1: a resolution chain
that lets a tenant or an agent override without touching code; an env allowlist that is the
*ultimate* constraint; a per-tenant allowlist row; and token metering per event and per day.

**What is missing on this path, honestly:**

- **A first-class model registry object.** The vision asks for one. Today the "catalog" is each
  preset's `defaultModels` array — code, not data, and not tenant-aware. The DB entities cover
  *permission* (`ai_tenant_model_allowlist`) but not *capability declaration* (context window,
  tool support, modality, qualification status).
- **Capability declarations.** The vision's rule — *"a model only advertises capabilities after
  qualification"* — has no home yet. `LlmModelInfo` carries `contextWindow` and free-form `tags`,
  and nothing else.
- **Cost control.** Token counts are recorded. Budgets, ceilings and per-tenant quotas are not.

**These three are real, and they are the substance of the "Model Broker" the vision describes.**
They are deferred in §10 with triggers, not hand-waved.

### 5.1 Where Hermes fits on this path

Hermes has its own provider system and its own catalogs. The boundary is: **Hermes reaches the model
server; the platform decides which models Hermes may use.** In Sprint 0 that is done with a named
custom provider (`providers.mercato-local`), which is the right shape — Hermes' `llamacpp` provider
id is reserved for its **managed** runtime and fails with *"The local model server is turned off"*
when pointed at an external server. The COOKBOOK already records this trap.

**The honest gap.** Today that configuration is set **by hand, per deployment**, through Hermes'
CLI. The vision's target is *"generate Hermes provider configuration from the platform-managed
profile."* Until that generator exists, the platform registry and Hermes' config are **two
authorities that can drift**. This is deferred in §10 with its trigger, and it is the same
"incremental bridge" the `llama/` analysis names.

---

## 6. The built-in open-source path — the owner's second ask

**The question:** can we run open-source models ourselves, so the system is self-sustaining long
term?

**The answer: yes, and it is already running — with two defects.**

### 6.1 The engine and the model

| Fact | Value | Source |
|---|---|---|
| Engine | `ghcr.io/ggml-org/llama.cpp:server` | `docker-compose.fullapp.yml` |
| Model | `Qwen2.5-7B-Instruct-Q4_K_M.gguf` | `MODEL_FILE` default |
| Context | `-c 65536` **plus** YaRN RoPE scaling | the compose command |
| Threads | `-t 4 -tb 8` | measured, see §7 |
| Tool calling | **`--jinja` is absent from the deployed command** (it is documented as added by this change, but the compose file itself was not touched — no code changed here) | §4.1 |

**Why YaRN is not optional.** The compose comment states the measured reason: Qwen2.5's GGUF
declares `n_ctx_train = 32768`, and llama.cpp **caps** the slot at that value. `-c 65536` alone
silently yields `n_ctx_slot = 32768`. The YaRN flags are what actually admit 64K. And 64K is not a
preference: Hermes refuses a local endpoint below its floor.

**The floor, measured from Hermes' own source:**

```python
# hermes_cli/local_runtime/context_policy.py
FLOOR = 64 * 1024          # = target; one internal constant
TARGET_WINDOW = 144 * 1024
```

### 6.2 B-16, traced to its root — and it is two defects, not one

**B-16 as recorded** in `BLOCKERS.md`:

```
Error: Failed to index 21 tools: Bulk indexing failed for 1 strategy(ies):
vector ([vector.embedding] Invalid OpenAI API key. Update the key and retry.)
```

**Read the error text.** `Invalid OpenAI API key` is **OpenAI's own error code**. It is produced by
the `apiCode === 'invalid_api_key'` branch of `embedding.ts`. llama.cpp does not emit that code. So
the request **reached OpenAI** — which means it never reached the local server.

**Defect 1 — the base URL never reached the MCP.** Measured, two independent routes:

- **Route A, the deployment.** `docker-compose.fullapp.yml` gives `OPENAI_BASE_URL` to `opencode`
  (line 16) and to `app` (line 204). The `mcp` service block (lines 48–113) has `OPENAI_API_KEY`
  (line 87) and **no `OPENAI_BASE_URL`**.
- **Route B, the SDK.** `node_modules/@ai-sdk/openai/dist/index.js:8259`:
  `loadOptionalSetting({ settingValue: options.baseURL, environmentVariableName: "OPENAI_BASE_URL" })`.
  The env var is the default source for `baseURL` when none is passed explicitly.

Together: `EmbeddingService` defaults to `providerId: 'openai'`, sees `OPENAI_API_KEY` present
("local"), builds `createOpenAI({ apiKey })` **with no explicit baseURL**, and the SDK falls back to
`https://api.openai.com/v1`. Result: 401 `invalid_api_key`. **The tool-search index runs in the MCP
container, which is the one container that was never told where the model is.**

**Defect 2 — there is no embedding model, and the endpoint is not enabled.** Even with the base URL
corrected, two things are still missing. **Measured:** the `model` service command carries no
`--embeddings` flag, and the loaded model is `Qwen2.5-7B-Instruct-Q4_K_M`, a chat model; the
runbook records the same observation from the other direction (*"llama.cpp serves no
`/v1/embeddings`"*). **Reasoned, not measured:** serving embeddings needs both the endpoint enabled
**and** a model whose pooling type supports it, which is why the clean answer is a **dedicated
embedding model** on its own port (§4.4) rather than a flag on the chat model. This is the half the
`llama/` analysis did name, and it is real.

**Why this matters beyond B-16.** The recorded severity is "nothing critical: only semantic search
over tools is degraded." That is true today. But the **same lane** serves the vector drivers
(`pgvector`, `qdrant`, `chromadb`) that the product's retrieval is built on. **A silent embedding
failure is a degraded product, not a degraded log line** — and the current failure mode is a
warning, not a gate.

### 6.3 Hermes' own managed runtime — what it is, and why it is not the production path

The `llama/` analysis corrected the premise "Hermes cannot manage models". Measured, it is stronger
than the analysis knew:

| Fact | Value |
|---|---|
| The package | `hermes_cli/local_runtime/` — **19 Python modules plus a JSON catalog (20 files), 4,307 lines of Python** |
| The modules | `__init__.py`, `binaries.py`, `bootstrap.py`, `capabilities.py`, `catalog.py` + `catalog.json`, `context_policy.py`, `detect.py`, `devices.py`, `endpoint.py`, `estimator.py`, `gguf.py`, `growth.py`, `hardware.py`, `hf_browse.py`, `load_progress.py`, `presets.py`, `processes.py`, `recovery.py`, `supervisor.py` |
| The default | `"enabled": False` — *"Off = detection-only (Hermes still finds an external llama-server you run)"* |
| The config | `backend: auto`, `models_max: 4` (*"Router process: how many models may be resident at once"*), `port: 0` (*pick a free port at spawn*) |
| The provider | `LLAMACPP_PROVIDER_ID = "llamacpp"`, name `"Local"`, transport `openai_chat`, **`api_key_env_vars=()`** — no key |
| Availability | *"The desktop Local Models interface is enabled for canary builds. Other desktop builds require the `--local` launch flag."* |

**So the precise statement is:** Hermes can install, supervise and route a llama.cpp runtime, but
that capability is a **desktop/canary feature**, and its `llamacpp` provider resolves only when
Hermes itself has staged models or a managed endpoint. In a headless Compose deployment with an
externally managed server, it is not the path — which is why Sprint 0 correctly uses a named custom
provider instead.

**Our recommendation: keep it that way.** Hermes' managed runtime is the right answer for a
single-user desktop install of Hermes. It is not a multi-tenant control plane, and adopting it as
one would put model lifecycle in the hands of the component whose job is to reason, not to govern.
The `llama/` analysis reached the same conclusion.

---

## 7. Performance — what is measured, and what is not

**The rule this section enforces:** the vision says *"never make the platform depend on `Qwen-XYZ`"*.
It does not say "local is fast". These are the numbers we have.

### 7.1 Measured, on the owner's laptop (2026-10-04)

| Measurement | Value |
|---|---|
| The machine | Dell Precision 7510, i7-6820HQ (4 cores / 8 threads), 32 GB RAM, CPU-only |
| Hermes' prompt | **~15,700 tokens** (system prompt + 21 MCP tool schemas) |
| Prompt ingest | **~12 to 13 tok/s** at default threads, declining as context grows (the runbook records *"~12 tokens/s and falls"*; the direct measurement in §7.2 records **13.2**) |
| Generation | **~0.8 to 4.6 tok/s** depending on thread split |
| A real agent turn | **~20 minutes just to ingest the prompt**, and the COOKBOOK measures **~41 minutes per turn**; hour-scale in the worst case |
| Memory | the model container reaches **~10 GiB of the Docker VM's 15.56 GiB** |

### 7.2 The thread split, measured directly

A direct `/completion` call, 1,207-token prompt, 64-token generation:

| `-t` / `-tb` | prompt ingest | generation |
|---|---|---|
| 4 / 4 (llama.cpp default) | 13.2 tok/s | 3.9 tok/s |
| 8 / 8 | 17.7 tok/s | 3.0 tok/s |
| **4 / 8 (what we ship)** | **19.3 tok/s** | **4.6 tok/s** |

Prompt ingest is compute-bound and wants all eight logical CPUs. Generation is memory-bandwidth-bound,
where extra threads cost more than they save. **The default wastes half the machine**, and this was
the free 46% the COOKBOOK already banked.

### 7.3 What is not measured, and must not be claimed

- **No throughput or latency figure transfers to other hardware.** The numbers above are one 2015
  laptop with no GPU offload.
- **No comparative benchmark against a hosted provider exists.** We cannot say local is slower or
  faster per euro, because we have never measured the same workload both ways.
- **GPU offload is not the fix on this machine.** The Quadro M2000M has 4 GiB; the model is ~4.4 GB
  and the 64K KV cache is ~3.7 GB. Partial offload at best, on a 2015 Maxwell chip.

### 7.4 Where the real wins are, in order

1. **Stop paying the prompt tax.** ~15,700 tokens of tool schemas are re-ingested every turn. Expose
   fewer tools per task. This is the single largest lever and it needs no new hardware.
2. **Use deterministic Functions.** The vision's whole point: repeated verified work should need no
   model at all. Every such Function is a turn that costs zero tokens.
3. **Right-size the context.** Not every request needs 64K. The floor is Hermes' requirement for a
   local endpoint, not a target for every call.
4. **Right-size the model.** The COOKBOOK already names Qwen2.5-3B (~2.3x) and 1.5B (~4.6x) for
   iteration, keeping 7B for final checks.
5. **Only then** consider router mode, sleep-on-idle or multiple profiles, and only after measuring
   the model-switch latency and memory churn.

**The order matters.** Fixing the thread split was free. Buying a GPU is not, and on this machine it
would not work.

---

## 8. The boundary that must not move

The `llama/` analysis's ownership table is correct and this document adopts it. Restated in one
place, because it is the part that keeps the product safe:

| Concern | Owner | The rule |
|---|---|---|
| Identity, tenant, scope | Starting Kit | The model never establishes identity. Policy is derived server-side, never from a prompt or a caller-supplied tenant id |
| Authorization and approval | Starting Kit policy gate | A generated tool call is a **proposal**. It passes the ordinary MCP path. The model server cannot authorize it |
| The agent loop and sessions | Hermes | Do not reimplement Hermes in the model server |
| Model eligibility and limits | Starting Kit | One source of truth. No per-agent override that bypasses tenant policy |
| Token generation | llama.cpp | No business database credentials. No tenant data store |
| Durable truth and audit | Starting Kit / Postgres / ledger | Inference logs are **not** the audit record |

**Three sharp consequences, each of which is a real thing that can go wrong:**

1. **An API key on llama-server is service authentication, not tenant authorization.** The `llama/`
   analysis labels the opposite belief *"False"* in its confidence table, and it is right. A key on
   the inference port says "you may talk to this server", not "you are tenant 7".
2. **A shared inference process is not shared tenant memory.** Request bodies, server logs, KV
   cache, cancellation and queue fairness all need explicit policy. Keep session memory and
   authorization above the model server.
3. **`/health` is public.** Keep the model port on the private network. Loopback publishing is for
   diagnosis only — which is exactly what the compose already does.

---

## 9. What is not decided, and it is the owner's

**One decision. Stated as a recommendation, not closed.**

**The question:** what should the **long-term default** be?

| Option | What it means in practice | What it costs |
|---|---|---|
| **A. Cloud-first, local as fallback** | Tenants get hosted models by default. The local server handles offline, privacy-classified and cheap-repetitive work | Best answer quality and speed today. Per-token spend. Data leaves the machine |
| **B. Local-first, cloud as fallback** | The local server is the default. Cloud is policy-gated escalation for hard reasoning | No per-token spend, data stays in the rack. **On today's hardware, hour-scale turns** (§7.1) |
| **C. Per-tenant policy** | Each tenant declares *local only / local preferred / cloud allowed / approved providers only*, and the broker enforces it before the request leaves | The vision's actual target (`03_Local_First...` §32). Needs the registry and budget work in §10 |

**Our recommendation: C, with A as the interim default.**

Reasoning, in one line each:

- **The vision already specifies C.** `03_Local_First...` §32 lists seven tenant modes, among them
  *local only*, *local preferred*, *cloud allowed* and *approved providers only*, and states that
  *"The Model Broker enforces this before any request reaches a provider."* So it is not a new
  direction, it is the stated one.
- **A is the only honest default while the hardware is this slow.** B would ship a product where a
  turn takes 20 minutes.
- **C is not buildable today**, because it needs the model registry and budget controls in §10. So
  A is the interim, and C is the destination.

**What this does not decide:** which specific open-weight model becomes the standard, whether to buy
GPU hardware, and whether self-hosting is a customer-facing promise or an internal capability. Those
are downstream of the default and are named in §10.

**One question for the owner, if it is wanted:** is the long-term default **C with an interim of A**
(the recommendation), or should the interim be **B** — local-first even at today's speed?

---

## 10. Deferred, each with its trigger

Per the COOKBOOK's zero-one rule: **a deferral must name its trigger.**

| Deferred | Trigger | Why it waits |
|---|---|---|
| **The `llamacpp` chat preset** (§4.2) | **the next `model`-service change** | It is one entry and it is safe now; it rides along with `--jinja` rather than being its own change |
| **The `openai-compatible` embedding provider** (§4.4) | **the first time an embedding is needed for real** | It is the largest of the four changes, and B-16 is not blocking anything today |
| **The embedding model choice** (§4.4) | **before the first durable index is built** | The dimension is a data migration once an index exists |
| **A first-class model registry object** (§5) | **the first tenant that needs capability declarations** | Today `defaultModels` plus `ai_tenant_model_allowlist` covers permission; capability has no consumer yet |
| **Capability qualification** (§5) | **the first capability claim anyone acts on** | The vision's rule is that a model advertises a capability only after qualification. Nothing qualifies capabilities today |
| **Budgets and per-tenant quotas** (§5) | **the first real spend** | Token counts are recorded (`ai_token_usage_event`, `ai_token_usage_daily`); nothing enforces a ceiling |
| **Generating Hermes' provider config from the platform registry** (§5.1) | **the second deployment, or the first config drift** | Today it is set by hand per deployment. The `llama/` analysis calls the hand-set state an acceptable transitional bridge |
| **Router mode / multiple resident models** | **a measured need for more than one model at once** | `models_max: 4` exists in Hermes' runtime, but router mode multiplies KV-cache memory. Do not enable it speculatively |
| **GPU offload** | **new hardware** | Not fixable on the Quadro M2000M (§7.3) |
| **A `deepseek` preset** (§5) | **the first time DeepSeek's own endpoint is wanted over DeepInfra's** | DeepSeek-the-model is already reachable |

---

## 11. Method note

**How the claims here were reached, so a later reader can re-run them.**

- **Every number has two routes.** The 21 packages and the `0.6.7` version: a directory count and a
  manifest read. The 11 presets: the export array and a count of the definitions. B-16's cause: the
  compose service blocks **and** the installed SDK's own dist. The embedding asymmetry: the type
  union **and** the client switch. The `--jinja` absence: three compose files, and the COOKBOOK and
  `library/development/` **as they stood before this change** — a search today finds the flag in
  them, because this change put it there.
- **The defects were found by reading, then confirmed by reading somewhere else.** `--jinja` was
  found in Hermes' docs, then searched for in our deployment, and then the **recorded symptom** was
  found in the COOKBOOK's Step 4 table — no call reached the platform, which matches the diagnosis.
  B-16's base URL was found in the compose and then confirmed in the SDK's own dist.
- **Three hostile passes were run, and they falsified nine of this document's own claims.** All were
  corrected rather than defended, and the corrections are visible in the text rather than quietly
  applied. **The third pass caught the subtlest one: the change that carried this document made one
  of its own sentences false** (see the `--jinja` scope row below).

  | The first draft said | What was measured | Status |
  |---|---|---|
  | "`--jinja` appears **nowhere** in the repository" | False. It appears in `library/ai/qwen-hermes-tool-calling-report.md` (five places), in `library/ai/hermes-docs/reboot/work/R6-LLAMA-SERVER-SSOT-REVIEW.md:33`, and in Hermes' own `local_runtime/supervisor.py:188`. And the first document **contradicts** our reading: it says `--jinja` is now default-on | **FIXED, and it changed the finding.** The claim is now scoped to the deployment and the development docs, the conflict is stated, and §4.1 gives the one command that settles it |
  | "the runbook records no outcome for the real agent turn" | False. The COOKBOOK's Step 4 table records it in detail — an agent turn where the model picked a tool and no call reached the platform | **FIXED, and it strengthened the finding** — see §4.1 |
  | "a 6-tier resolution chain" | The chain has **seven** tiers, and the document's own list numbered seven | **FIXED** |
  | "6 generated entities" | The directory holds **10** | **FIXED** — scoped to the six that govern the model layer |
  | "Both lanes already resolve through one `model-factory.ts`" | The embedding lane runs through `EmbeddingService`, not the factory — which the same row's own Status cell already said | **FIXED** |
  | SDK quote read `loadSetting(...)` | The call is `loadOptionalSetting(...)`, at line 8259 | **FIXED** |
  | "See §5.3" | No §5.3 exists; the Hermes managed-runtime section is §6.3 | **FIXED** |
  | *"`--jinja` is absent from the deployment and from the development documents"* | **This change made that sentence false about the tree it ships in** — the same commit adds the flag to the COOKBOOK, `RUNBOOK-sprint0.md` and `BACKLOG.md`. The claim was right about the tree *before* the change and wrong about the tree *after* it | **FIXED** — the tense is now explicit, and the sentence says which documents carry the fix |
  | *"three independent checks agree nothing reached the platform"* | The COOKBOOK's own ledger caveat removes two of the three: a read-only tool writes no `action_logs` row and API-key usage is never recorded, so both are NULL regardless. **Only the MCP log line discriminates** | **FIXED** — and it is a weaker claim than the first draft made, which is the point |

- **The lesson, and it is the project's own rule paying off again.** The first draft's `--jinja`
  claim came from a repository-wide search that **timed out**. A check that did not finish is not a
  check, and the claim built on it was wrong in the direction that flatters the finding. The
  hostile pass found it by re-running the search scoped.
- **The prior analysis was verified, not accepted.** Four of its claims were corrected or sharpened
  and one was confirmed (§1.2). Its recommendation survived.
- **Nothing here is closed that belongs to the owner.** §9 states one decision and recommends an
  answer; it does not record it as taken.
- **No code, deployment or runtime was changed to write this.** It is a design document.

**The four changes in §4 are our calls and are cheap to overrule.** If any of them is wrong, the
cost is one entry, one flag or one line — which is the standard this project's decisions are held to.
