# Investigation brief: Hermes + llama-server prompt caching, session readiness, and API alternatives

## Purpose

Please read this brief, inspect the actual deployed platform and repository, verify the technical claims against the running implementation and relevant upstream documentation, and report whether any of the described techniques are useful for our platform.

**This is a diagnostic-only task. Do not change code, prompts, configuration, timeouts, model settings, deployment settings, or persistent records. Do not commit anything. Do not run disruptive or very long tests against production.** If a test could approach the existing 2,400-second timeout, propose a safe test plan first and report what can already be learned from code, configuration, and existing logs.

The goal is to understand the real source of first-message latency and the best way to reuse shared prompt work and recently active conversation state. Do not assume the answer must be “trim the system prompt.”

---

## Platform context and reported findings to verify

The platform provides a chat interface integrated with Hermes. The local inference server is `llama-server`; the platform may also be able to use commercial model APIs (for example OpenAI and Qwen/Alibaba Model Studio).

A previous agent report made these claims, which are **unverified until independently checked**:

- One new conversation has a prompt of approximately **16,572 tokens**; an older run reportedly measured 16,725.
- Approximately **6,022 tokens** were said to have been reused from cache, while **10,988** were described as processed fresh. Those numbers do not reconcile: 16,572 − 6,022 = 10,550, not 10,988. Check whether they came from different runs or whether a figure is wrong.
- A first request reportedly took approximately **2,280 seconds** against a **2,400-second** limit.
- The reported input-processing rate was about **7.3 tokens/second**, but it is unclear whether this describes prompt evaluation, output generation, or a derived estimate.
- About **6,700 tokens** were attributed to a fixed system-prompt preamble.
- The server was reported to remain running, with the model loaded, rather than sleeping between requests.
- The host was reported to have 8 CPU threads while the model process was configured to use 4, and the server reportedly uses 4 parallel slots. These details also need to be verified against the live configuration and actual process arguments.
- The agent previously suggested trimming the fixed preamble as the only change likely to materially improve the first turn. That conclusion is not yet established.

Do not present any of these as fact without evidence from the deployed version, process arguments, worker logs, server logs, metrics, and/or request-level measurements.

## Critical distinctions to preserve

Please distinguish these layers explicitly in the investigation:

1. **Model weights and runtime:** Whether the process/model is loaded and resident in RAM/VRAM, or must start/load after being unloaded.
2. **Saved conversation history:** The durable transcript, stored independently for each session and used to reconstruct the context on resume.
3. **Rendered request/prompt:** The actual system instructions, tools, memory snapshots, history, retrieved material, and current user message serialized for a particular model request.
4. **Prompt-prefix/KV cache:** Numerical attention state from previously processed matching tokens, which can sometimes be reused to avoid recomputing the same prefix. This is not the same thing as saving a chat transcript.
5. **Output generation:** Generating response tokens after processing the input; prompt caching does not by itself make output-token generation faster.
6. **Queueing/concurrency:** Time spent waiting for a slot/resource, or performance degradation when several requests compete for CPU, memory bandwidth, or GPU memory.

A new conversation properly has its own history, but can still share identical leading system/tool instructions with other conversations. Independent chat histories must not be mixed. Shared-prefix reuse can be safe and useful when the serving system supports it and its isolation rules are respected.

A restored transcript does **not automatically prove** that the inference engine also restored its KV cache. Verify those as separate properties.

---

## Investigation tasks

### 1. Identify the actual runtime and version

Inspect and report:

- Exact `llama-server` / llama.cpp version or commit, launch arguments, relevant environment variables, service/container configuration, model file/model name, quantization, context size, GPU offload/device configuration, CPU thread settings, parallel slots, batching settings, and whether the process is really always resident.
- The exact Hermes version/commit and whether this platform uses upstream Hermes unchanged, a fork, or a separate worker that constructs requests itself.
- Which component constructs the final model request: Hermes, the platform worker, an adapter/gateway, or a provider-specific SDK.
- Which timeout is 2,400 seconds: browser/UI, platform worker, HTTP client, gateway, or model server. Record when its clock starts/stops and the consequences of its expiration.
- Whether requests use `/v1/chat/completions`, another endpoint, or a custom protocol.

Redact secrets and API keys from all output. Do not print credential values.

### 2. Inspect prompt assembly and session boundaries

Capture or reconstruct one representative **rendered request** using the production code path, safely and with private values redacted. Break it into token counts for:

- Fixed/shared system instructions.
- Stable platform/project instructions.
- Tool definitions and their serialized representation/order.
- Variable instructions or overlays.
- User/profile memory and retrieved memory.
- Per-conversation history.
- Current user turn.
- Any other provider/template-added input that can be measured.

Identify what changes from one new chat to another and in what order the components appear. In particular, find whether timestamps, session IDs, runtime/workspace paths, user-specific values, memories, or dynamic tool lists appear before otherwise shared content and therefore break prefix matching early.

Verify how individual session histories are persisted and restored. Confirm whether they are logically and access-control separated by conversation/user. Determine whether the platform loads prior history into a new request, restores a saved inference slot, restores a KV-cache file, or does some combination.

**Important upstream references:** Current Hermes docs describe prompt assembly with stable, context, and volatile tiers, and separately document saved sessions. This is a lead to inspect, not proof that our deployed build follows current upstream behavior:

- Hermes prompt assembly: https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly
- Hermes sessions: https://hermes-agent.nousresearch.com/docs/user-guide/sessions

### 3. Verify llama.cpp prompt/KV cache behavior

Inspect the exact running version’s configuration and logs, focusing on relevant settings/features, including where supported:

- `--cache-prompt` / `--no-cache-prompt`
- `--cache-ram`
- `--cache-idle-slots` / `--no-cache-idle-slots`
- Unified KV behavior and parallel slots (`-np` / `--parallel`)
- Continuous batching
- Prompt-cache reuse logs/metrics and whether a reused prefix is reported for each request
- Slot save/restore support, if relevant to resuming a session

Do not assume a current upstream default applies to our version. Report both the documented default for our version and the effective live value. Distinguish a cache setting being enabled from a measured cache hit.

Current upstream reference (verify version applicability): https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md

Questions to answer:

- Does a first request create reusable prefix state for subsequent requests?
- Can a different conversation reuse the exact shared prefix when its subsequent chat-specific suffix differs?
- Does the current server/cache arrangement retain useful prefix state after a slot becomes idle or is reused?
- Is the cache in RAM, VRAM, both, or moved between them in this configuration?
- What exact evidence proves a cache hit (rather than an assumption based on token count)?
- Is the 6,022-token figure actually reported by the serving engine, or calculated by the worker? What does the field mean?

### 4. Reconstruct the latency accurately

Using existing request-level logs/metrics where possible, separate at least:

- Queue/wait-for-slot time.
- Model load/startup time, if any.
- Time to first token.
- Prompt-evaluation time and prompt tokens evaluated.
- Reused/cached tokens or prefix length, if available.
- Output tokens, generation time, and output tokens/second.
- Total wall-clock time.
- Any retries, tool calls, subprocess work, network delays, and serialization overhead.
- CPU/RAM/VRAM/GPU utilization or other relevant constraints during the request.

Reconcile all token arithmetic. Do not infer prompt-evaluation speed from end-to-end duration unless clearly labelled as a rough estimate. Confirm whether the reported 7.3 tokens/second is a real engine metric and which phase it measures.

If historical logs do not capture the needed values, list the missing instrumentation and propose a safe, controlled benchmark; do not install or change anything in this diagnostic task.

### 5. Evaluate an efficient “ready chat” policy

Assess three different levels independently:

**A. Shared-prefix cache:** Keep the stable common system instructions and tool schemas at the start of all prompts, in deterministic order, where supported. Keep volatile/user-specific content later when security and prompt semantics allow. Confirm the real tokenized prefix stays identical across sessions.

**B. Recent conversation KV state:** Consider retaining state for active/recent chats only, subject to a measured memory budget, time-to-live, and eviction policy (for example, least-recently-used). Treat the durable transcript as the source of truth. If the cache is evicted, rebuild from the transcript. Do not precompute or retain every possible chat by default.

**C. Prefetch/warm-up:** Determine whether an intentional warm-up or prefill with the *actual stable prefix* can produce a reusable cache entry in the current server. Do not assume a generic ping helps. Avoid changing any production cache by probing without an agreed test plan.

For each strategy, explain expected latency benefit, memory/storage cost, CPU/GPU contention, cache hit uncertainty, invalidation rules when instructions/tools change, isolation risks, and what measurable result would demonstrate success.

Estimate resident per-session KV cache only from the actual model and KV configuration or observed metrics. Do not use a generic estimate as if it were a measurement. Explain whether retained state consumes system RAM, VRAM, or both, and compare its cost against the benefit of retaining just the shared prefix.

### 6. Compare provider/inference options without committing to one

Provide a short, evidence-based comparison of:

- Current `llama-server` configuration after verification.
- Whether another llama.cpp configuration might solve the issue with least disruption.
- vLLM automatic prefix caching, if the model, hardware, operating environment, and platform compatibility make it a plausible option.
- OpenAI API prompt caching for an eligible current model.
- Qwen / Alibaba Cloud Model Studio context caching for an eligible current model/API mode.

Use official documentation for the exact supported provider/model and API mode. Do not assume all Qwen endpoints or all OpenAI models have identical cache behavior. Identify any API adaptation work needed for Hermes tools/function calling, streaming, context handling, and response formats. Keep API keys out of logs and the report.

Official references to start from:

- llama.cpp server: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- vLLM automatic prefix caching: https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/
- OpenAI prompt caching: https://developers.openai.com/api/docs/guides/prompt-caching
- Alibaba Cloud Model Studio context cache for Qwen: https://www.alibabacloud.com/help/en/model-studio/context-cache
- Qwen Responses API context/session caching note: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-api-via-openai-responses

For external APIs, consider price and cached-input pricing, actual cache-hit observability, data privacy/retention, provider availability, latency, throughput, tool-calling compatibility, and vendor dependence. Do not make up current pricing; use current official pricing if estimating costs.

### 7. Benchmark plan

Propose (and only run if already safe and possible without changes) a comparable test matrix. Use the same model, rendered prompt, output length, and server conditions wherever meaningful. Include:

1. First request with the common prefix (cache miss / cache creation if identifiable).
2. A second request with the identical shared prefix but a different conversation-specific suffix.
3. A follow-up in the same conversation.
4. A resumed conversation after an idle interval.
5. A repeated test under controlled concurrency, if safe.
6. A comparison request to candidate APIs with equivalent prompt behavior, if valid credentials already exist and running a test is authorized; do not expose credentials or incur material costs without authorization.

Record each case's cache hit/miss, prompt tokens evaluated, time to first token, total duration, and resource usage. Repeat enough times to separate ordinary variation from a real improvement, while staying within safe time/cost limits. State whether the test is synthetic or representative of production.

### 8. Make a recommendation, but do not implement

Rank the viable options by likely impact and effort. Explicitly consider:

- Do nothing until the measurement problem is resolved.
- Improve stable-prefix placement/determinism.
- Correct or tune existing llama.cpp caching/slot/memory settings.
- Retain only recent active-chat states.
- Move selected workloads to a commercial API with provider-side caching.
- Evaluate another inference server (such as vLLM) only if justified.
- Trim the system prompt only if the measured latency benefit justifies it and no required behavior is lost.

Do not change anything as part of this task. Return the findings and ask for approval before any implementation.

---

## Required report format

Return a concise report with these headings:

1. **Verified deployment facts** — version, model, runtime, launch arguments, effective cache settings, slot/parallel configuration.
2. **Measured baseline** — one table with input/prompt counts, cached/reused counts, prompt-evaluation time, time to first token, output-generation time, total time, and resource usage. Mark unavailable values as unavailable; do not estimate silently.
3. **Root cause** — distinguish proven facts from hypotheses; reconcile the token and timing discrepancies.
4. **Best caching opportunities** — shared prefix versus per-session state; what already works and what does not.
5. **Resource estimate** — cost of keeping recent session state resident, based on actual measurements/configuration, with assumptions shown.
6. **Local vs API comparison** — benefits, limitations, cost/privacy implications, and compatibility effort.
7. **Ranked recommendations** — expected benefit, effort, risk, evidence, and confidence.
8. **Next decision needed** — the smallest useful next step for the owner to approve.
9. **Files/commands inspected** — paths and exact sources used, with secrets redacted.

Clearly label every claim as **measured**, **verified from configuration/code**, **documented upstream**, **inferred**, or **unknown**. Avoid treating a documentation default as proof of the live value.

---

## Important guardrails

- This brief authorizes investigation only, not implementation.
- Do not trim, reorder, or otherwise edit the system prompt in this task.
- Do not modify launch arguments, concurrency, cache limits, slots, timeouts, or providers.
- Do not commit, update the project's decision records, or change generated pages as part of this diagnostic pass unless explicitly authorized later.
- Do not run repeated tests that can tie up a worker for many minutes or hours.
- Never log or reproduce API keys, credentials, customer messages, private user memory, or unredacted prompt contents in a report. Use redacted or synthetic data where possible.
- Keep independent conversation histories isolated. A reusable shared prefix must never be used as a reason to mix personalized context between sessions or users.
- Do not assume “saved conversation,” “prompt assembled in a cache,” “model loaded in memory,” and “inference KV cache hit” mean the same thing.

The success criterion is a verifiable explanation of why the first turn is slow and a low-risk, measured path to make new and returning chats responsive. No code or configuration changes are authorized yet.
