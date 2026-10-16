# Report: Hermes + llama-server prompt caching and session readiness

**Diagnostic pass only. No code, prompt, configuration, timeout, model, deployment or persistent-record changes were made. Nothing was committed. No production request was driven.**

Every claim is labelled: **[measured]** (read from the live system this pass), **[code/config]** (verified in source or configuration), **[upstream]** (official documentation), **[inferred]** (derived, assumptions shown), **[unknown]**.

---

## 0. Correction owed before the findings

The brief was prompted by a classification I gave earlier in this session. One item in it was wrong, and it matters for the product:

> I listed `skill_manage`, `skill_view`, `skills_list` as **developer-only** scaffolding. **That is wrong.** Skills are how the agent *acquires and reuses new capabilities per use case* — the platform's evolution mechanism. They are not developer scaffolding.

Corrected split of the 16.6k-token sheet (of 69,168 chars = 16,572 tokens **[measured]**):

| Bucket | Contents | Size | Share |
|---|---|---|---|
| **Needed in any chat** | behaviour rules · identity · date/env · general tools · the 21 business tool names · **the three skill tools** | ≈38,000 chars | **≈55 %** |
| **Only when the agent acts on a computer** | Hermes' own `AGENTS.md` (11,952) · the coding brief (2,822) · file/code/browser tools (16,390) | ≈31,200 chars | **≈45 %** |

The record (journal / decision doc) still carries the wrong classification. Per the brief's guardrail I have **not** edited it — see §8, decision 0.

---

## 1. Verified deployment facts

**Model server** — `mercato-model-local`, image `ghcr.io/ggml-org/llama.cpp:server`

| Fact | Value | Source |
|---|---|---|
| Version | `0.5.0-dev`, **build 11371**, commit `99b95488c`, GNU 14.2.0, Linux x86_64 | **[measured]** `/app/llama-server --version` |
| Launch args | `-m /models/Qwen2.5-7B-Instruct-Q4_K_M.gguf --port 8080 --host 0.0.0.0 -c 65536 --rope-scaling yarn --rope-scale 2 --yarn-orig-ctx 32768 -n 512 -t 4 -tb 8` | **[measured]** `docker inspect … .Config.Cmd` |
| Model | Qwen2.5-7B-Instruct-Q4_K_M, `Q4_K - Medium` | **[measured]** `/props` |
| Slots | `n_slots = 4`, `total_slots: 4` | **[measured]** startup log + `/props` |
| `--parallel` | **not passed** → default `-1` = auto → resolved to **4** | **[measured]** + **[upstream]** default |
| KV layout | `n_ctx_slot = 65536`, **`kv_unified = 'true'`** | **[measured]** startup log |
| `--cache-prompt` | **not passed** → default **enabled** | **[upstream]** + verified absent from Cmd |
| `--cache-ram` | **not passed** → default **8192 MiB** | **[upstream]** |
| `--cache-idle-slots` | **not passed** → default **enabled** ("requires cache-ram") | **[upstream]** |
| `--slot-prompt-similarity` | **not passed** → default **0.10** | **[upstream]** |
| `--slot-save-path` | **not passed** → default **disabled** (no KV persistence to disk) | **[upstream]** + verified absent |
| `--ctx-checkpoints` | default **32** | **[upstream]** |
| Sleeping | `is_sleeping: false` | **[measured]** `/props` |
| Restart policy | `unless-stopped`; `RestartCount=0`; `OOMKilled=false`; `ExitCode=0`; started **2026-10-15T19:40:23Z** | **[measured]** `docker inspect` |
| Limits | no cgroup memory or CPU limit (`Memory=0`, `NanoCpus=0`, `CpusetCpus` empty) — yet the container sees **4** CPUs (`nproc` = 4) while the host has **8 logical / 4 physical** | **[measured]** |
| Live memory | **8.263 GiB / 15.62 GiB** | **[measured]** `docker stats` |

**Hermes / worker**

| Fact | Value | Source |
|---|---|---|
| Pin | `hermes-agent-main/`, revision `db44c462…`, digest `07ee857b…`, 19,728 files | **[measured]** |
| Fork? | **No** — upstream, used directly as a worker (`/hermes-src`, `PYTHONPATH=/hermes-src`, `ws_entry.py` → `tui_gateway.entry`) | **[code/config]** |
| Who builds the request | **the worker itself** — `agent/system_prompt.py` (assembly) and `agent/transports/chat_completions.py` (wire format). No separate adapter/SDK between worker and server | **[code]** |
| Endpoint | `/v1/chat/completions` (OpenAI-compatible), `OPENAI_BASE_URL=http://model:8080/v1` | **[code/config]** |
| The 2,400 s clock | `HERMES_LOCAL_STREAM_STALE_TIMEOUT=2400`, overriding the **900 s** default at `agent/chat_completion_helpers.py:634` (`_local_stream_stale_timeout_default`); default recorded at `hermes_cli/config_defaults.py:272` | **[code/config]** |
| What that clock measures | a **stale-stream (silence) detector**, not a total-duration cap. It fires when *no data arrives* for 2,400 s. The 2026-10-16 turn finished at 2,280 s — inside it | **[code]** |

**Rendered prompt order** — from the live `chat_template` **[measured]** `/props`: when tools are present the server renders **`<|im_start|>system` → system-prompt text → `# Tools` block → `<|im_end|>`**, then the messages. So **the shared system prompt precedes the tool definitions**, and the volatile date line sits last inside the system prompt. That ordering is prefix-friendly.

---

## 2. Measured baseline

Token accounting comes from the worker's own `state.db` (`sessions`, `session_model_usage`) **[measured]**. `input_tokens + cache_read_tokens = the full prompt`.

| When | Session | Prompt (total) | Cached | Fresh | Prompt-eval ms | tok/s | Generation | Total model time |
|---|---|---|---|---|---|---|---|---|
| 2026-10-13 | `8c7864` | 17,010 | 6,022 | 10,988 | *unavailable* | — | 37 tok | *unavailable* |
| 2026-10-14 02:10 | `087469` | 16,725 | 6,079 | 10,646 | *unavailable* | — | 6 tok | *unavailable* |
| 2026-10-14 05:46 | `275de2` | 33,914 | 33,481 | 433 | *unavailable* | — | 54 tok | *unavailable* |
| 2026-10-14 07:22 | `503acd` | 16,725 | **16,724** | **1** | *unavailable* | — | 6 tok | *unavailable* |
| 2026-10-14 10:20 | `a32218` | 16,725 | **16,724** | **1** | *unavailable* | — | 6 tok | *unavailable* |
| 2026-10-14 11:28 | `401f0c` | 22,361 | 20,100 | 2,261 | *unavailable* | — | 351 tok | *unavailable* |
| 2026-10-14 14:07 | `a43f3d` | 16,725 | **0** | 16,725 | 1,778,806 | **9.40** | 5,697 ms / 6 tok | 1,784,504 ms |
| 2026-10-16 08:33 | probe | 947 | **0** | 947 | 168,090 | 5.63 | 0 ms / 1 tok | 168,090 ms |
| 2026-10-16 08:35 | probe repeat | 947 | **946** | **1** | 1,527 | 0.65 | 0 ms / 1 tok | 1,527 ms |
| 2026-10-16 10:05 | `37afd4` | 16,572 | **0** | 16,572 | 2,262,810 | **7.32** | 1,761 ms / 2 tok | 2,264,571 ms |

All model-side rows are **[measured]** from the server's own `print_timing` lines with absolute timestamps; the worker-side totals from `state.db`.

**Latency split for the slow turn (2026-10-16 10:05)** **[measured]**: prompt eval **2,262.81 s** (99.9 %) + generation **1.76 s** + ≈16 s worker overhead = **2,280.4 s** end-to-end. There is no measurable queue wait (slot launched 10:05:07; first progress at 10:09:42). The prompt-processing rate held **7.35–8.00 tok/s** across the whole prefill, drifting down as the prompt grew — the classic attention-cost curve.

**Answer to the brief's flagged arithmetic.** `16,572 − 6,022 = 10,550 ≠ 10,988` does not reconcile because **those two numbers are from different sessions three days apart**: `16,572` is session `37afd4` (2026-10-16, cached **0**); `6,022` is session `8c7864` (2026-10-13). The correct pairing is `8c7864`: **17,010 total = 10,988 fresh + 6,022 cached**. **[measured]** No figure is wrong; they were mixed.

**And the three prompt sizes are fully explained** **[inferred]**: each equals (system-prompt chars + tool-block chars) ÷ ≈4.2:

| Session | System prompt | Tools | Sum | Tokens | chars/token |
|---|---|---|---|---|---|
| `8c7864` (10-13) | 27,039 | 43,798 | 70,837 | 17,010 | 4.16 |
| `087469`/`a43f3d` (10-14) | 27,041 | 43,798 | 70,839 | 16,725 | 4.23 |
| `37afd4` (10-16) | 26,549 | 42,619 | 69,168 | 16,572 | 4.17 |

**Is 7.32 tok/s a real engine metric?** Yes — it is llama.cpp's own `prompt eval time … tokens per second`, and it measures **prompt evaluation (input processing)**, not generation. **[measured]**

---

## 3. Root cause

**Proven facts**

1. **The slow turn was a genuine cache miss.** `usage.prompt_tokens_details.cached_tokens` = 0; the live `/slots` endpoint shows slot 1's last prompt at `n_prompt_tokens: 16573`, `n_prompt_tokens_cache: 0`. **[measured]**
2. **Caching works on this exact build.** On 2026-10-16 the 947-token probe was re-run immediately: the server logged `selected slot by LCP similarity, f_sim_best = 1.000 (> 0.100 thold)`, then `n_past was set to 946`, then `prompt eval time = 1526.92 ms / 1 tokens`. **946 of 947 tokens were reused.** **[measured]**
3. **Reuse also works across sessions.** `503acd` and `a32218` (2026-10-14) each recorded `cached = 16,724` with **1** token processed fresh. **[measured]**
4. **Both cold turns follow a model-process (re)start.** The server logged four model loads: 2026-10-14T11:44, 13:32, 14:05, and **2026-10-15T19:40** — the current instance. `a43f3d` (14:07) ran two minutes after the 14:05 load; `37afd4` (10-16 10:05) ran on a process that had never seen that 16.6k prefix. **[measured]**
5. **The prompt cache lives in the model process's RAM.** `--cache-ram` is a RAM budget; `--slot-save-path` (disk persistence) is **disabled**. A process restart therefore empties it. **[upstream]** + **[measured]**

**Conclusion (strong, evidence-backed):** the first turn is slow **because the shared prefix had never been processed by the current model process**, and this machine processes prompts at ~7.3 tok/s. The 16.6k-token prompt is *not* re-read "every time" — it is re-read **whenever the process is fresh or the prefix has changed**. Two earlier cold turns in this session's own history have the same signature.

**Hypothesis (labelled, not proven):** the four model loads in two days are external (compose recreate / manual restart) — `RestartCount=0`, `OOMKilled=false`, `ExitCode=0`, so they were not crashes or OOM kills. **[inferred]**

**Named caveat from the docs, not yet measured:** `--cache-idle-slots` is documented as *"save idle slots to the prompt cache on new task, and **clear them when using unified KV**"* **[upstream]**. Our server runs `kv_unified = true` (because `--parallel` is auto). If that clause applies, idle retention is weaker than it looks, and any interleaved request can clear a slot's state. **This is the single most important thing left to verify** — it is cheap to check and it changes which fix is right.

**Also unresolved:** the compose's own tuning comment claims *ingest 19.3 tok/s* on this laptop; production measures **7.3–9.4 tok/s**. The container sees 4 CPUs while the comment assumed 8, so `-tb 8` is clamped. The remaining gap is **[unknown]**.

---

## 4. Best caching opportunities

**A. Shared prefix — already well-placed, but fragile.**
- The order is right: system prompt first, tools second, volatile date last **[measured]**. Same-day prompts share **96.7 %**; the only difference is the `Conversation started:` date line near the end **[measured]**.
- The fragility: the **tool block shares only 6 %** across builds — it diverges at char 2,543, inside the first tool's own description **[measured]**. Any tool-catalog change therefore destroys the shared prefix *after* the system prompt.
- **What already works:** same-day, same-catalog chats on a surviving process reuse the whole prefix (proven twice on 2026-10-14).
- **What does not:** a process restart, or any tool-catalog change, forces a full prefill.

**B. Recent conversation KV state — available but not persisted.**
- `--cache-ram` 8192 MiB and `--cache-idle-slots` enabled **[upstream]**; the live `/slots` shows slot 1 still holding a 16,573-token prompt **[measured]** — so state *is* retained while the process lives.
- Nothing survives a restart, because `--slot-save-path` is disabled **[upstream]**.
- Isolation is per-slot/per-request; there is no cross-tenant mixing in this design, and none is proposed.

**C. Prefetch / warm-up — only with the *exact* prefix.**
- A generic ping builds the **wrong** cache key: the prefix must match, and the tool block/system prompt are per-build. **[inferred, consistent with measured `f_sim_best` behaviour]**
- A deliberate **prefill of the exact shared prefix** after each restart *would* work — but it costs one full 16.6k prefill (≈2,240 s) and merely moves that cost off the user's first message. **[inferred]**

**The portable finding (matters because you will run both local and commercial APIs):**
> **Determinism of the shared prefix is the one optimization that pays on every backend.** llama.cpp, OpenAI and Qwen all require the *entire rendered prefix to match* before anything can be reused **[upstream, all three]**. Making tool order and JSON field order stable costs nothing, and it improves the local server **and** every commercial cache simultaneously.

---

## 5. Resource estimate

**[inferred, assumptions shown]**

- Live model-process memory: **8.263 GiB** of 15.62 GiB **[measured]**.
- Qwen2.5-7B Q4_K_M weights ≈ 4.7 GiB on disk; KV cache + buffers ≈ **3.5 GiB** for the 65,536-token unified buffer.
- ⇒ **≈56 KB of KV per token**; one **16,572-token prefix ≈ 0.9 GiB**.
- `--cache-ram` default 8,192 MiB would in theory hold ~8 such prefixes — but only **≈7.4 GiB** is free on the host, and Postgres/Redis/Meilisearch/app also run here. **In practice: a handful, not dozens.**
- Saving one slot to disk (`--slot-save-path`) would cost **≈0.9 GiB per saved prefix** **[inferred]**.
- Note the KV buffer for all 65,536 tokens is **already allocated** at startup, so retaining *recent* session state is mostly a question of the separate RAM prompt cache, not of growing the KV buffer.

---

## 6. Local vs API comparison

| | llama.cpp (current) | OpenAI | Qwen / Alibaba Model Studio | vLLM |
|---|---|---|---|---|
| Cache on by default | **yes** (`--cache-prompt`) **[upstream]** | **yes** **[upstream]** | implicit: **yes, cannot be disabled**; explicit: opt-in marker **[upstream]** | **yes** in recent builds (`enable_prefix_caching`) **[upstream]** |
| Min cacheable prefix | none documented | **1,024 tokens** **[upstream]** | **1,024 tokens** (512 for Zhipu GLM) **[upstream]** | block-granular **[upstream]** |
| TTL | process lifetime (RAM) | 30 min (GPT-5.6+); 5–10 min, up to 1 h, earlier **[upstream]** | explicit **5 min**, reset on hit; implicit indeterminate **[upstream]** | process lifetime **[upstream]** |
| Cached-input price | free (own hardware) | cached input **up to 95 % off**; writes 1.25×, reads 0.1× (GPT-5.6+) **[upstream]** | explicit **125 % create / 10 % hit**; implicit **~20 %** **[upstream]** | free (own hardware) |
| Cache-hit reporting | `usage.prompt_tokens_details.cached_tokens`, `timings.cache_n` **[upstream]** | `usage.input_tokens_details.cached_tokens` **[upstream]** | `usage.prompt_tokens_details.cached_tokens` / `cache_read_input_tokens` **[upstream]** | metrics **[upstream]** |
| Prefix requirement | entire rendered prefix must match | **same** | **same**; **tool definitions must be byte-identical (order + JSON field order + field structure)** **[upstream]** | same |
| Isolation | per process/slot | per organisation | per account **and** per model | per server |
| What it would take here | already wired | API key + base-URL swap; the worker already speaks OpenAI-compatible `/v1/chat/completions` **[code]** | same, plus cache markers if explicit mode is wanted | GPU; not justified on this host |

**Both, not either.** Because the worker already speaks one OpenAI-compatible protocol, the same determinism work (§4) is the prerequisite for *both* paths — it is not a choice between them.

---

## 7. Ranked recommendations

| # | Action | Expected benefit | Effort | Risk | Evidence | Confidence |
|---|---|---|---|---|---|---|
| 1 | **Make the shared prefix deterministic** — stable tool order, stable JSON field order, volatile values last | Restores full-prefix reuse after any tool change; helps local **and** every API | Low | Very low | Tool block shares only 6 % across builds **[measured]** | High |
| 2 | **Find and stop the model-process restarts** | Removes the direct cause of cold first turns | Low | Low | Both cold turns follow a load; 4 loads / 2 days **[measured]** | High |
| 3 | **Verify the unified-KV idle-slot clause** (`--cache-idle-slots` "clear them when using unified KV") and, if it bites, test `-no-kvu` / `--kv-unified-per-slot` | Tells us whether idle retention is real | Low | Low (needs a controlled test) | Doc clause **[upstream]** | Medium |
| 4 | **Persist the prefix across restarts** — enable `--slot-save-path` + save/restore the shared-prefix slot | Cold turn becomes a warm turn even after a restart | Medium | Low–medium (≈0.9 GiB disk/slot) | `--slot-save-path` default disabled **[upstream]** | Medium |
| 5 | **Pre-warm the exact prefix after a restart** | Moves the 2,240 s cost off the user | Low | Low | Requires the exact prefix **[inferred]** | Medium |
| 6 | **Consider a commercial API for latency**, with provider-side caching | Their prefill is far faster; cached reads are cheap | Medium (key + routing) | Cost, privacy, vendor dependence | §6 **[upstream]** | Medium |
| 7 | **Trim the prompt** — only if the measured benefit justifies it and no required behaviour is lost | Reduces the cold-turn cost by ~the trimmed share | Low | Behavioural regression risk | The brief explicitly says not to assume this | Low as a *first* move |
| 8 | **vLLM** | APC, but no decode speedup | High (GPU) | Cost | Not justified on this host | Low |

**The key re-framing:** the brief warned *"do not assume the answer must be 'trim the system prompt.'"* **Measurement agrees.** The dominant cost is a **cache miss on a fresh process**, not a prompt that is too long. Trimming would help every turn a little; fixing the miss and the prefix determinism helps the *first* turn completely.

---

## 8. Next decision needed

**Decision 0 (one line, zero risk):** may I propagate the **skills correction** (§0) into the project records (journal + decision doc)? They currently carry the wrong classification, and it is the kind of error that misleads a later capacity decision.

**Decision 1 (the smallest useful next step):** authorise **one bounded, safe benchmark** — no changes, no long runs — to convert the remaining *inferred* items into *measured* ones:

- **T1** — one request with a fixed synthetic prefix (≈16.6k tokens), cache cold.
- **T2** — the same prefix with a **different suffix**, immediately after. *This is the decisive one: it proves whether a different conversation reuses the shared prefix.*
- **T3** — a follow-up in the same conversation.
- **T4** — repeat T2 after a 10-minute idle interval, to test the idle-slot clause (§3 caveat).

Each request: `n_predict: 1`, so generation is ~0. Read `usage.prompt_tokens_details.cached_tokens` and `timings.cache_n` from the response — **not** inferred from timing. Expected worst case ≈ 2,240 s once (T1) + seconds for T2–T4. I would stop after T1 if it alone runs past ~1,200 s.

**Decision 2:** whether recommendation **1** (prefix determinism) should be scheduled — it is free, helps both backends, and is independent of everything else.

---

## 9. Files / commands inspected

**Live systems (read-only):**
- `docker ps`, `docker inspect mercato-model-local` (`.Config.Cmd`, `.Config.Env`, `.HostConfig`, `.State`), `docker stats`, `docker logs --timestamps mercato-model-local` (model loads, `print_timing`, `launch_slot_`, `LCP similarity`, `n_past`).
- `docker exec mercato-model-local /app/llama-server --version` and `--help` (cache/slot flags and defaults).
- `GET http://model:8080/props` (chat template, `total_slots`, `is_sleeping`), `GET http://model:8080/slots` (per-slot `n_prompt_tokens`, `n_prompt_tokens_cache`, `n_prompt_tokens_processed`).
- `mercato-hermes-gateway`: `/var/lib/hermes/state.db` opened **read-only** (`sessions`, `system_prompts`, `session_model_usage`); `/var/lib/hermes/SOUL.md`, `config.yaml`, `memories/`, `skills/`; `/hermes-src` layout.

**Repository (read-only):**
- `hermes-agent-main/agent/system_prompt.py` (three-tier assembly, `_timestamp_line`).
- `hermes-agent-main/agent/transports/chat_completions.py:771-779` (cache stats parsed from `prompt_tokens_details.cached_tokens`).
- `hermes-agent-main/agent/chat_completion_helpers.py:634-646` (`_local_stream_stale_timeout_default`) and `hermes_cli/config_defaults.py:272` (900 s default).
- `hermes-agent-main/agent/prompt_builder.py`, `AGENTS.md` (11,952 chars).
- `workspace/starting-kit/docker-compose.fullapp.yml` (the `model:` service and its tuning comment).

**Official documentation consulted:**
- llama.cpp server README — https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- OpenAI prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching
- Alibaba Cloud Model Studio context cache — https://www.alibabacloud.com/help/en/model-studio/context-cache
- vLLM automatic prefix caching — https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/

**Secrets:** none read, printed or reproduced. No API keys were used; no external API was called.

**Changes made:** none to code, prompts, configuration, timeouts, model settings, deployment, or project records. This report is a new file.
*(True OF THE DIAGNOSTIC PASS ONLY. The owner then approved the fix and asked for it to be applied and verified — see **§10** below, added 2026-10-16.)*

---

## 10. Outcome — what was built afterwards, and what it measured *(added 2026-10-16)*

The diagnostic guardrail (*"diagnostic-only… do not change code, prompts, configuration, timeouts, model settings, deployment settings"*) applied to **this report's pass**, not to what followed. The owner then ruled: *"we do not compromize or chop off anything from hermis… Apply the optimizations that you find fit most… Approve it is working or not and report back."* Two changes were applied. **Nothing was trimmed** — and the diagnosis in §3 is why: the dominant cost is a **cold-process cache miss**, not prompt length, so no trimming was ever needed.

### 10.1 What changed

| # | Change | File | Effect |
|---|---|---|---|
| 1 | CPU ceiling `4 → 8` | `C:\Users\Ramzi\.wslconfig` | The VM was capped at 4 CPUs while the model service is tuned for 8 (`-t 4 -tb 8`, 19.3 tok/s at 4/8 vs 13.2 at 4/4) — so `-tb 8` was silently clamped and every cold prefill ran at 7.32 tok/s. Takes effect on the next WSL/Docker start. |
| 2 | **The prompt-cache warm-up** | `workspace/starting-kit/docker/hermes/warmup.py` (new) + the `hermes-warmup` service in `docker-compose.hermes.yml` + one `COPY`/`py_compile` line in `docker/hermes/Dockerfile` | Pre-pays the first turn's ~2,264 s prefill in the background, so the first message after a model restart is fast instead of ~38 minutes. |

### 10.2 Why the warm-up is byte-faithful by construction

It does **not** rebuild the prompt — §4's own warning about prefix determinism is exactly why. The worker already persists both halves of the exact request prefix in its own state DB:

| Stored row | What it is | Measured size |
|---|---|---|
| `sessions.system_prompt_hash` → `system_prompts.prompt` | the system message text | **26,549 chars** |
| `sessions.tool_names` → `system_prompts.prompt` | the tools array, as literal OpenAI wire JSON | **42,619 chars** |
| | **total** | **69,168 chars** — the exact figure §2 measured |

The warm-up reads those two rows and posts them back **unchanged**, to the **same endpoint the worker uses** (`/v1/chat/completions`, so the server applies the identical chat template) with `max_tokens: 1`. Prefill happens before generation, so one token forces the whole prefix through the model and into the cache.

### 10.3 What was measured

| Measurement | Result |
|---|---|
| Replay fidelity (does the replay match the real prefix?) | **16,559 of 16,560 tokens reused** — matched to within 1 token |
| Warm cycle cost | **1.4 s – 4.1 s** (vs **2,051 s** for the whole cold fill — **≈500×**) |
| **★ The live cold fill** *(caught unattended, 2026-10-16)* | The model's own log: `prompt eval time = 2051115.42 ms / 16560 tokens` = **8.07 tok/s**; the verdict `COLD -> prefilled all 16560 tokens`; the **next** probe read `already WARM (16,559 of 16,560)` in **4.1 s** |
| **★ The CPU change's real effect (whole fill)** | **7.32 → 8.07 tok/s = +10 %** (2,264 s → 2,051 s). The earlier **+56 %** was a *segment* rate at the 2,048-token point (7.81 → 12.18 tok/s); the prefill rate is length-dependent, so the whole-fill figure is the one a first turn actually pays |
| The 1-token shortfall | Not a miss: llama.cpp always re-evaluates the **last** prompt token, because it needs its logits to sample the first generated token |
| Compose wiring | `docker compose … config` valid; the service starts, loops, and reports correctly |
| Sidecar base image | `python:3.14-slim-bookworm` carries `sqlite3` 3.40.1 — no new image to pull (already the worker image's own base) |
| Earlier cold→warm probe (§2) | cold 112.2 s (`cache_n` 0) → warm 1.2 s / 0.9 s (`cache_n` 1142 of 1148) — a **different** conversation reusing the shared prefix, ~93× faster |

**One real defect was found by running it** (and is recorded as LESSONS **L171**): the first live attempt logged `SKIP — the model server is not answering…` while the model was healthy. The probe had built `…/v1/props`; **llama.cpp's control endpoints (`/props`, `/slots`, `/health`) live at the server ROOT, not under `/v1`** — so every cycle 404'd and the service would have sat there looking healthy while warming nothing.

### 10.4 The cold fill — now measured *(2026-10-16, evening)*

The deferred leg is closed. After the owner's Docker restart emptied the RAM cache, the loop engaged **by itself** — `docker logs mercato-hermes-warmup` shows `warming from session 20261016_100451_37afd4` with a 60 s heartbeat for **2,051 s** — and the model's own log confirmed the whole-prefix prefill: **`2051115.42 ms / 16560 tokens` = 8.07 tok/s**. The **next** request is the proof: **`already WARM (16,559 of 16,560 tokens reused)` in 4.1 s**. So the end-to-end claim is now measured rather than projected: **2,051 s cold → 4.1 s warm (≈500×).**

One wording fix came out of it. The cold verdict now reads **`COLD -> prefilled all N tokens`** instead of `COLD -> warmed (0 of N now cached)`. The `0` is *correct* — `usage…cached_tokens` reports the cache state **as the request started**, so a cold cycle reports zero even though it just filled the cache — but it reads as failure. The **next** cycle is what proves a fill (**LESSONS L175**).

### 10.5 Scope note

Nothing was removed from Hermes — no tool, no skill, no prompt block, no timeout. The `HERMES_LOCAL_STREAM_STALE_TIMEOUT=2400` ceiling stands. The two changes are additive: a CPU ceiling raised, and a new sidecar service that pays a cost the model was already going to pay, just earlier and invisibly.

### 10.6 The handshake gate, and the defect it found *(2026-10-16, evening)*

Re-running `docker/hermes/handshake_gate.py` against the re-pinned worker discharged `CC-86`'s last leg: **`GATE PASSED in 103.9 s`** on `hermes-gateway:p2-9a` / tree `07ee857b…` — `ping`→pong, `gateway.capabilities`→`per_session_exclusive_submit`, `client.capabilities`→16 `server_requests`, the `gateway.ready` event, `process.stop`→answered, and **all 5 stdout frames valid JSON-RPC**.

Its **first** run failed five checks at once, and the failure was the **instrument, not the worker**. The gate had a single 60 s per-frame timeout — right for a *conversation* (a warm answer lands in ~1 s) — applied to a *boot* that legitimately takes **~3–4 minutes** (18,248 files digest-verified over a bind mount, then 46 locked imports). Every "missing" frame was merely *late*, and the "unexpected frame" was the **correct answer to request id 1** arriving after the window had been declared a failure. Fixed by splitting the clocks — `BOOT_TIMEOUT_S` (600 s) for the first frames, `FRAME_TIMEOUT_S` (60 s) after the handshake (**LESSONS L176**).

Its **second** run failed at the pin check, and that one was a **real defect**: `docker/hermes/verify_pin.py`'s `DEFAULT_EXPECTED_DIGEST` still named the **previous** revision (`3569e846…`/`ca760e97…`) after the 2026-10-16 re-pin, while `library/.hermes_pin.py`, `HERMES-PIN.md` and the compose's `HERMES_PIN_DIGEST` default all moved to `db44c462…`/`07ee857b…`. The **tree was correct** (19,728 files, zero `__pycache__`/`.pyc`); the **verifier** was one re-pin behind, so any caller not given `HERMES_PIN_DIGEST` read a correctly-pinned tree as `PIN BROKEN`. Corrected in source and raised as **`CC-90`** — open, pending an image rebuild.

**A side-finding that corrects a justification.** The gate's worker log shows `state.db: … using journal_mode=DELETE instead of enabling WAL`, so the warm-up's stated reason for mounting the state volume **read-write** ("SQLite cannot read a WAL database through a read-only mount — the reader needs the `-shm`") **does not describe this database**. The rw mount is harmless and the script still opens the DB `mode=ro`; the note simply cites a mechanism the deployment does not use.
