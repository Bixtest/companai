# Paperclip + Hermes + llama-server Production SSOT

**Status:** Production-candidate baseline / single source of truth  
**Reviewed:** 2026-08-14  
**Target host:** `vmi3208447` — Ubuntu 22.04.5 LTS, KVM, x86-64  
**Host compute:** 8 AMD EPYC vCPU, AVX2/FMA, CPU-only inference  
**Host RAM:** 23 GiB  
**Selected inference runtime:** llama.cpp `llama-server`  
**Selected model:** Qwen3.5-9B, GGUF Q4_K_M  
**Selected GGUF:** `Qwen3.5-9B-Q4_K_M.gguf` from `unsloth/Qwen3.5-9B-GGUF`  
**Model API alias:** `qwen3.5-9b`  
**Hermes context:** 65,536 tokens  
**Initial inference concurrency:** one server slot (`--parallel 1`)

---

## 1. Purpose and authority

This document is the authoritative deployment definition for the local AI layer used by Paperclip and Hermes on this VPS. It supersedes the earlier Ollama-oriented design and any earlier multi-model proposal.

The objective is deliberately narrow:

> Run one capable local model, through one shared inference process, with enough context for Hermes agent/tool workflows, while preserving predictable RAM/CPU behavior on the shared 8-vCPU VPS.

The production chain is:

```text
Paperclip
   |
   | OpenAI-compatible request(s) to Hermes
   v
Hermes Agent
   |  one official container
   |  one or more supervised Hermes profiles
   |
   | OpenAI-compatible /v1/chat/completions
   v
llama-server
   |  one shared sidecar container
   |  one model instance
   v
Qwen3.5-9B Q4_K_M
```

The local model is shared by all Hermes profiles/roles. Do **not** create one model server per Hermes profile, per Paperclip agent, or per task.

This is a **production-candidate** definition until the acceptance tests in this document pass on the actual VPS. “Fits in RAM” is not sufficient; tool-call correctness, latency, stability, and host headroom are all acceptance requirements.

---

## 2. Source hierarchy used for this SSOT

Where behavior is version-sensitive, use this precedence:

1. Current official Hermes Agent documentation and current `NousResearch/hermes-agent` source.
2. Current official llama.cpp `llama-server`, function-calling, and Docker documentation.
3. Official Qwen model configuration/model card.
4. The selected GGUF repository only for the deployment artifact itself.
5. Measurements from this exact VPS override generic performance estimates.

If an upstream release changes a documented behavior, do not silently change production. Stage it, repeat the acceptance suite, then update this SSOT.

---

## 3. Locked architecture decisions

These are intentional decisions, not defaults to be casually changed.

1. **Use llama.cpp `llama-server`, not Ollama, for the production inference layer.**
2. **Run llama-server as a sidecar container**, not inside the Hermes image and not as one copy per agent.
3. **Use one local model only:** Qwen3.5-9B Q4_K_M.
4. **Use single-model server mode**, not llama-server router/multi-model mode.
5. **Keep the one model resident** while the AI stack is running.
6. **Configure 65,536 total context tokens** because Hermes requires at least 64K for agent/tool use.
7. **Start with `--parallel 1`.** Logical Paperclip/Hermes concurrency may be higher, but local model generation is serialized initially.
8. **Use `--jinja`** so llama-server performs OpenAI-style function/tool handling through its Jinja chat-template path.
9. **Disable Qwen reasoning at server startup with `--reasoning off` for the initial production baseline.** This is primarily a tool-call reliability decision.
10. **Use Q8_0 KV cache for K and V** rather than default F16 to reduce the 64K context memory footprint without moving to the more aggressive Q4 KV-cache trade-off.
11. **Disable llama-server Web UI (`--no-ui`).** We need an inference API, not a second interface.
12. **Authenticate llama-server even though it is private.** Hermes gets a dedicated bearer key.
13. **Do not publish llama-server port 8080 to the VPS host/public Internet.** It exists only on a private Docker network.
14. **Paperclip talks to Hermes, not directly to llama-server.** Hermes remains the agent/tool/memory boundary.
15. **Use the current Hermes one-container/multi-profile architecture.** The official Hermes Docker image supervises profiles with s6.
16. **Do not put `API_SERVER_PORT` globally in the Hermes container environment if multiple profiles will run.** Each profile that exposes its own API server gets its own port in that profile’s `.env`.
17. **Persist all Hermes state under `/opt/data` and the GGUF under a host model directory.** Container replacement must not erase either.
18. **No automatic production upgrades.** After acceptance, pin exact image digests and freeze the accepted GGUF checksum.

---

## 4. Actual VPS capacity baseline

The supplied server inventory shows:

```text
OS:             Ubuntu 22.04.5 LTS
Virtualization: KVM
CPU:            8 x AMD EPYC vCPU
SIMD:           AVX2 + FMA
RAM:            23 GiB
GPU:            none reported / treat as CPU-only
Disk:           ~776 GiB root filesystem, large free capacity
```

Before Docker cleanup the host had only about 4.2 GiB available RAM. After the old stacks were stopped, the measured state became:

```text
Mem total:       23 GiB
Mem used:        6.2 GiB
Mem free:        13 GiB
Mem available:   15 GiB
Swap:            0
```

That 15 GiB measurement was taken while a remaining Konsult CISO stack was still active, including a backend using roughly 4.27 GiB. Do **not** assume an exact final free-RAM number until the obsolete stack has been fully removed/stopped and `free -h` is measured again.

### Capacity policy

For the first production-candidate run:

- llama-server container ceiling: **14 GiB**.
- Hermes container ceiling: **4 GiB**.
- Target host `MemAvailable` while exercising realistic agent workloads: **>= 4 GiB**.
- `MemAvailable <= 3 GiB` under routine one-slot operation is a **capacity failure** that must be investigated.
- Any kernel OOM event is a failed deployment.
- Swap is allowed only as emergency protection, never as normal inference capacity.

These ceilings are guardrails, not expected steady-state usage.

---

## 5. Selected model: Qwen3.5-9B Q4_K_M

### Canonical model

Upstream model:

```text
Qwen/Qwen3.5-9B
```

Deployment artifact:

```text
unsloth/Qwen3.5-9B-GGUF
Qwen3.5-9B-Q4_K_M.gguf
```

### Why this model

Qwen3.5-9B is the quality target we selected after freeing substantial RAM on the VPS. It is large enough to be materially more capable than the 2B/4B class, yet the Q4_K_M GGUF is still realistic for a 23 GiB CPU-only machine that must also run Paperclip, Hermes, Plesk, and normal host services.

The upstream Qwen model is Apache-2.0 and declares a native text context of 262,144 tokens. The chosen Q4_K_M GGUF is approximately **5.68 GB on disk**. Disk size is **not** the same as loaded runtime memory: weights, KV cache, runtime buffers, prompt state, and concurrent server slots add memory beyond the file size.

### Why 65,536 context instead of 262K

Hermes requires at least 64,000 tokens for agent/tool workflows. The model can theoretically support much more, but a 262K KV/context allocation on this VPS would trade away memory headroom for context we do not need as the baseline.

Production baseline:

```text
Model context: 65,536
Hermes context: 65,536
Parallel slots: 1
```

### Why there is no second local model

If 9B is fast enough for the real Paperclip workload, a second “fast” model adds more complexity than value:

- model-routing decisions;
- possible model loading/unloading churn;
- risk of two model processes or two resident models if configuration drifts;
- inconsistent quality across agents;
- more failure modes to debug.

Every local Hermes profile therefore uses the same `qwen3.5-9b` endpoint.

---

## 6. Qwen3.5 reasoning/tool-calling reliability policy

Current llama.cpp supports Qwen-style reasoning controls and OpenAI-style tool calls, but current Qwen3.5 issue reports show an important edge case: with thinking enabled, some Qwen3.5 tool calls can appear as raw XML/reasoning text rather than structured `message.tool_calls`.

For this reason the initial production baseline forces non-thinking mode at **both** layers:

### llama-server

```text
--reasoning off
```

Do **not** use the older startup workaround:

```text
--chat-template-kwargs '{"enable_thinking":false}'
```

Current llama.cpp treats that startup approach as deprecated in favor of `--reasoning off`.

### Hermes

```yaml
agent:
  reasoning_effort: "none"
  tool_use_enforcement: true
```

Current llama-server accepts per-request `reasoning_effort: none`, and Hermes’ custom provider uses the corresponding non-thinking controls. Server-side `--reasoning off` remains the authoritative backstop.

`tool_use_enforcement: true` is intentional even though current Hermes auto-mode also includes Qwen. Explicit `true` keeps this deployment independent of future changes to Hermes’ model-family auto list.

### Re-enabling reasoning later

Thinking/reasoning may be evaluated later as a controlled change, but only if the exact candidate llama.cpp + Hermes versions repeatedly pass the structured tool-call tests in this document with reasoning enabled.

Do not enable reasoning merely because a benchmark score improves.

---

## 7. Filesystem layout

Use one permanent deployment root:

```text
/opt/paperclip-ai/
├── compose.yaml
├── .env                         # Docker Compose secrets; chmod 600
├── models/
│   ├── Qwen3.5-9B-Q4_K_M.gguf
│   └── Qwen3.5-9B-Q4_K_M.gguf.sha256
└── hermes/                      # mounted at /opt/data
    ├── .env                     # default Hermes profile API server settings
    ├── config.yaml
    ├── SOUL.md                  # optional/default profile identity
    ├── profiles/
    ├── sessions/
    ├── memories/
    ├── skills/
    ├── cron/
    ├── hooks/
    └── logs/
```

Create the base directories:

```bash
mkdir -p /opt/paperclip-ai/{models,hermes}
chmod 700 /opt/paperclip-ai
cd /opt/paperclip-ai
```

Hermes’ official Docker image treats `/opt/data` as the persistent source of truth. Do not mount two separate Hermes containers onto the same `/opt/data` directory.

---

## 8. Download and freeze the GGUF

Use an ephemeral helper container so the host itself does not need Python/Hugging Face packages installed:

```bash
docker run --rm \
  -v /opt/paperclip-ai/models:/models \
  python:3.12-slim \
  sh -lc 'pip install --no-cache-dir huggingface_hub hf_xet && \
          hf download unsloth/Qwen3.5-9B-GGUF \
          Qwen3.5-9B-Q4_K_M.gguf \
          --local-dir /models'
```

At the time this SSOT was reviewed, the current artifact was approximately 5.68 GB and the current LFS pointer showed:

```text
SHA256 03b74727a860a56338e042c4420bb3f04b2fec5734175f4cb9fa853daf52b7e8
```

Freeze and verify it:

```bash
cd /opt/paperclip-ai/models

echo '03b74727a860a56338e042c4420bb3f04b2fec5734175f4cb9fa853daf52b7e8  Qwen3.5-9B-Q4_K_M.gguf' \
  > Qwen3.5-9B-Q4_K_M.gguf.sha256

sha256sum -c Qwen3.5-9B-Q4_K_M.gguf.sha256
```

### If the checksum differs

**Stop. Do not simply overwrite the expected checksum.**

An upstream GGUF can change while retaining the same filename. A different hash means this is a different artifact and it must be reviewed and re-accepted deliberately.

Once an artifact passes production acceptance, preserve the actual GGUF file as part of backup/recovery, not only its checksum.

---

## 9. Secrets and profile-local API configuration

We need two unrelated secrets:

1. `LLAMA_SERVER_API_KEY` — Hermes -> llama-server.
2. `HERMES_API_SERVER_KEY` — Paperclip -> default Hermes API server.

Create them once:

```bash
cd /opt/paperclip-ai
umask 077

LLAMA_SERVER_API_KEY="$(openssl rand -hex 32)"
HERMES_API_SERVER_KEY="$(openssl rand -hex 32)"

cat > .env <<EOF
LLAMA_SERVER_API_KEY=${LLAMA_SERVER_API_KEY}
HERMES_API_SERVER_KEY=${HERMES_API_SERVER_KEY}
EOF

cat > hermes/.env <<EOF
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=${HERMES_API_SERVER_KEY}
API_SERVER_MODEL_NAME=paperclip-hermes
EOF

chmod 600 .env hermes/.env
unset LLAMA_SERVER_API_KEY HERMES_API_SERVER_KEY
```

Important:

- Do not enable CORS unless a browser is genuinely calling Hermes directly. Paperclip-to-Hermes is server-to-server and does not need it.
- Do not put `API_SERVER_PORT=8642` in the Compose-level `environment:` block. Additional Hermes profiles would inherit it and collide.
- Each additional profile that exposes an API server must get a unique `API_SERVER_PORT` in its own profile `.env`.

---

## 10. Canonical Hermes configuration

Create `/opt/paperclip-ai/hermes/config.yaml`:

```yaml
model:
  default: qwen3.5-9b
  provider: custom
  base_url: http://llama-server:8080/v1
  api_key: ${LLAMA_SERVER_API_KEY}
  context_length: 65536
  max_tokens: 4096

agent:
  reasoning_effort: "none"
  tool_use_enforcement: true

compression:
  enabled: true
  threshold: 0.50

tool_loop_guardrails:
  warnings_enabled: true
  hard_stop_enabled: true
  hard_stop_after:
    exact_failure: 5
    same_tool_failure: 8
    idempotent_no_progress: 5
```

### Why this is deliberately simple

Hermes officially supports any OpenAI-compatible endpoint implementing `/v1/chat/completions` through `provider: custom`. We therefore use the direct documented custom endpoint configuration instead of introducing a named-provider abstraction that this deployment does not need.

### Timeout policy

The Compose service will set:

```text
HERMES_API_TIMEOUT=1800
```

Do **not** explicitly set Hermes’ non-streaming stale timeout for this local CPU endpoint. Current Hermes behavior auto-disables the stale-call detector for local endpoints when it is left implicit; explicitly setting a short stale timeout would risk killing legitimate long CPU prompt-prefill operations.

### Compression

Hermes needs 64K context, but that does not mean every conversation should be allowed to grow to the edge of the window. Keep compression enabled. The 0.50 threshold intentionally begins compaction well before context exhaustion.

### Auxiliary model rule

Do not configure a separate auxiliary LLM. Hermes’ default auxiliary routing can use the main model. This preserves the one-local-model rule.

---

## 11. Canonical Docker Compose

Create `/opt/paperclip-ai/compose.yaml`:

```yaml
name: paperclip-ai

services:
  llama-server:
    image: ghcr.io/ggml-org/llama.cpp:server
    container_name: paperclip-llama
    restart: unless-stopped

    environment:
      LLAMA_API_KEY: ${LLAMA_SERVER_API_KEY}

    command:
      - --model
      - /models/Qwen3.5-9B-Q4_K_M.gguf
      - --alias
      - qwen3.5-9b
      - --host
      - 0.0.0.0
      - --port
      - "8080"
      - --ctx-size
      - "65536"
      - --parallel
      - "1"
      - --threads
      - "7"
      - --threads-batch
      - "8"
      - --cache-type-k
      - q8_0
      - --cache-type-v
      - q8_0
      - --jinja
      - --reasoning
      - "off"
      - --no-ui
      - --metrics

    volumes:
      - ./models:/models:ro

    expose:
      - "8080"

    networks:
      - ai-inference

    mem_limit: 14g
    stop_grace_period: 120s

  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: paperclip-hermes
    restart: unless-stopped
    command: ["gateway", "run"]

    env_file:
      - ./hermes/.env

    environment:
      LLAMA_SERVER_API_KEY: ${LLAMA_SERVER_API_KEY}
      HERMES_API_TIMEOUT: "1800"

    volumes:
      - ./hermes:/opt/data

    expose:
      - "8642"

    shm_size: "1gb"
    mem_limit: 4g

    networks:
      ai-inference:
      paperclip-app:
        aliases:
          - hermes

    depends_on:
      llama-server:
        condition: service_healthy

networks:
  ai-inference:
    name: paperclip-ai-inference
    driver: bridge
    internal: true

  paperclip-app:
    name: paperclip-app
    driver: bridge
```

---

## 12. Why each llama-server setting exists

### `--model /models/Qwen3.5-9B-Q4_K_M.gguf`

Single-model mode. No router, no model autoloading, no model switching.

### `--alias qwen3.5-9b`

Gives Hermes a stable model ID independent of the on-disk filename.

### `--ctx-size 65536`

Explicitly prevents llama-server from reading the model’s much larger training context and allocating more context than we intend. It also matches Hermes’ configured context exactly.

### `--parallel 1`

One inference slot. This keeps the full 65,536-token budget available to the one active generation and avoids multiplying context/KV pressure on an 8-vCPU host.

> **MEASURED 2026-10-16 (rule 13) — the running deployment does NOT pass `--parallel`, so this "1" is a recommendation, not the current state.** The `model:` service in `workspace/starting-kit/docker-compose.fullapp.yml` sets no `--parallel` / `--slots` / `LLAMA_ARG_N_PARALLEL` (the container's entire environment is `PATH` + `LLAMA_ARG_HOST`). This llama.cpp build (`version: 0.5.0-dev`, build 11371, commit `99b95488c`) documents the flag as `-np, --parallel N (default: -1, -1 = auto)` (env `LLAMA_ARG_N_PARALLEL`), and **auto selected 4**. Measured two ways, agreeing: the server's own startup log — `srv load_model: initializing, n_slots = 4, n_ctx_slot = 65536, kv_unified = 'true'` — and the live `/props` endpoint — `"total_slots": 4`. Because `kv_unified = true` the four slots **share** the one 65,536-token buffer (the budget is *not* multiplied four-fold, so the memory worry above is milder than stated), but they **compete for the same CPUs**, so two simultaneous long turns each run at roughly half the single-turn token rate. To make this "1" real, the compose must pass `--parallel 1` explicitly.
>
> **Same note, second finding:** the host has **8 logical CPUs** (`Win32_ComputerSystem.NumberOfLogicalProcessors = 8`, 4 physical cores) but the **container sees only 4** (`nproc` = 4; `docker info` `NCPU = 4`) — Docker is limiting it. So the compose's `-tb 8` is clamped to 4, and the benchmark comment above (which compares "8/8" and "4/8") does **not** describe the running configuration. The measured production prefill rate is **7.32 tok/s** (`2262809.92 ms / 16572 tokens`).

### `--threads 7`

Use seven of eight vCPUs for token generation, leaving one logical CPU worth of scheduling headroom for Hermes, Paperclip, Docker, Plesk, networking, and the OS.

This is a starting value, not a religious constant. Acceptance benchmarking may compare 7 versus 8, but production must preserve host responsiveness.

### `--threads-batch 8`

Allow prompt/batch processing to use all eight vCPUs because prompt ingestion is latency-sensitive and bursty.

### `--cache-type-k q8_0` / `--cache-type-v q8_0`

llama.cpp defaults KV cache to F16. Q8_0 reduces the context cache footprint. At 64K this matters materially.

### `--jinja`

Required/strongly recommended for llama-server’s OpenAI-style function/tool handling. Hermes is an agent and tool calling is a core requirement, so this is not optional for our baseline.

### `--reasoning off`

Server-wide non-thinking mode. This avoids the current Qwen3.5 thinking/tool-call parser failure mode and improves latency.

### `--no-ui`

Disables llama-server’s built-in Web UI. We only need the API.

### `--metrics`

Enables the Prometheus-compatible `/metrics` endpoint, including prompt throughput, generation throughput, request-processing, and deferred-request metrics. This remains private on `ai-inference`.

### `LLAMA_API_KEY`

llama-server supports API-key authentication. The private Docker network is the main security boundary, but authentication provides defense in depth.

### No `ports:` on llama-server

Do not publish 8080. `expose` documents the container port but does not expose it on the VPS public interface.

---

## 13. Docker network model

There are two Docker networks because the inference process should have a smaller network surface than Hermes.

```text
paperclip-app (normal bridge)
  Paperclip <----------> Hermes
                         |
                         |
                         +---- ai-inference (internal bridge) ----> llama-server
```

### `ai-inference`

```yaml
internal: true
```

Only the model path lives here. The model server does not need Internet access after the GGUF is mounted.

### `paperclip-app`

Normal application network for Paperclip <-> Hermes and for whichever external/networked behavior the application architecture requires.

Hermes is dual-homed because it must both:

- receive Paperclip requests; and
- reach llama-server.

### If Paperclip is deployed in another Compose project

Reference the existing network rather than creating a second one:

```yaml
networks:
  paperclip-app:
    external: true
    name: paperclip-app
```

Then attach the Paperclip service to `paperclip-app`.

Paperclip can address the default Hermes API as:

```text
http://hermes:8642/v1
```

---

## 14. Hermes Docker/profile architecture

Current Hermes Docker documentation recommends **one official container hosting multiple profiles**. The image uses s6 supervision so each profile gateway becomes a supervised service with its own state/logs.

Use that architecture unless there is a specific compliance/security/resource-isolation reason to create separate Hermes containers.

### Create a profile

Example:

```bash
cd /opt/paperclip-ai
docker compose exec hermes hermes profile create researcher
```

The profile data lives under:

```text
/opt/data/profiles/researcher/
```

### Give the profile its own API-server port

If Paperclip must address that profile directly:

```bash
cat >> /opt/paperclip-ai/hermes/profiles/researcher/.env <<'EOF'
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8643
API_SERVER_KEY=REPLACE_WITH_A_UNIQUE_SECRET
API_SERVER_MODEL_NAME=researcher
EOF

chmod 600 /opt/paperclip-ai/hermes/profiles/researcher/.env

docker compose exec hermes hermes -p researcher gateway restart
```

Use 8644, 8645, etc. for further profile API servers.

Do **not** publish these ports to the host if Paperclip is on the same Docker network. A container on `paperclip-app` can reach them directly.

### All profiles share the same inference endpoint

Unless deliberately overridden, profiles use the same mounted Hermes configuration/provider path and therefore the same:

```text
http://llama-server:8080/v1
model: qwen3.5-9b
```

The “different agent” behavior should come from profile identity/SOUL, skills, memory, tools, permissions, and workflows — not from loading another local LLM.

---

## 15. Paperclip integration contract

Paperclip integrates with Hermes, not llama-server.

For the default Hermes profile:

```text
Base URL:   http://hermes:8642/v1
Auth:       Authorization: Bearer <HERMES_API_SERVER_KEY>
Model ID:   paperclip-hermes
```

Hermes’ API server is OpenAI-compatible and is the correct boundary because Hermes owns the actual agent loop, tools, memory, skills, and execution behavior.

If Paperclip assigns jobs to multiple Hermes profiles, each profile can expose its own internal API port/model name as described above while all profiles continue to share the one llama-server process.

### Important concurrency distinction

Paperclip can have many **logical** agents running or waiting at once. That does not require many model instances.

Baseline behavior:

```text
Paperclip jobs:          many possible
Hermes profiles:         many possible
llama-server model:      one
llama-server slots:      one
Active local generation: one at a time
```

Other agents may continue doing non-LLM work, I/O, tool calls, waiting, or queueing while one local generation owns the inference slot.

---

## 16. Start the stack

Before starting, confirm the obsolete Docker stacks have been stopped and record the clean host baseline:

```bash
free -h
docker stats --no-stream
```

Then:

```bash
cd /opt/paperclip-ai

docker compose config

docker compose pull
docker compose up -d
docker compose ps
```

Watch initial model loading:

```bash
docker compose logs -f llama-server
```

The official llama.cpp server image includes a health check against `/health`. During model loading the endpoint returns unavailable/503; once ready it returns HTTP 200 with status `ok`.

---

## 17. Acceptance suite — mandatory

Do not connect production Paperclip traffic until all gates pass.

### 17.1 Container state

```bash
cd /opt/paperclip-ai
docker compose ps
```

Required:

- `llama-server` is running and healthy;
- `hermes` is running;
- neither is restart-looping.

### 17.2 Health from Hermes to llama-server

```bash
docker compose exec hermes sh -lc \
'curl -sf http://llama-server:8080/health && echo'
```

Expected:

```json
{"status":"ok"}
```

This proves Docker DNS/networking from Hermes to the model sidecar, not merely host reachability.

### 17.3 Model discovery

```bash
docker compose exec hermes sh -lc \
'curl -sS \
  -H "Authorization: Bearer ${LLAMA_SERVER_API_KEY}" \
  http://llama-server:8080/v1/models'
```

Required: returned model ID includes:

```text
qwen3.5-9b
```

### 17.4 Direct text completion

```bash
docker compose exec hermes sh -lc '
curl -sS http://llama-server:8080/v1/chat/completions \
  -H "Authorization: Bearer ${LLAMA_SERVER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "model":"qwen3.5-9b",
    "messages":[{"role":"user","content":"Reply exactly with: LLAMA_OK"}],
    "max_tokens":32
  }'"'"''
```

Required assistant content:

```text
LLAMA_OK
```

### 17.5 Structured tool-call test — critical gate

```bash
docker compose exec hermes sh -lc '
curl -sS http://llama-server:8080/v1/chat/completions \
  -H "Authorization: Bearer ${LLAMA_SERVER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "model":"qwen3.5-9b",
    "messages":[{
      "role":"user",
      "content":"Use get_server_status for host vmi3208447. Do not answer from memory."
    }],
    "tools":[{
      "type":"function",
      "function":{
        "name":"get_server_status",
        "description":"Get server status",
        "parameters":{
          "type":"object",
          "properties":{"host":{"type":"string"}},
          "required":["host"]
        }
      }
    }],
    "tool_choice":"auto",
    "max_tokens":256
  }'"'"''
```

**Pass condition:** `choices[0].message.tool_calls` contains a structured call to `get_server_status` with `host = vmi3208447`.

**Fail conditions:**

- raw `<tool_call>` or XML appears as normal assistant text;
- malformed JSON/tool arguments;
- parser/server error;
- model describes that it would use the tool but emits no tool call.

Repeat this test at least **10 times** before accepting the build.

### 17.6 Hermes configuration validation

```bash
docker compose exec hermes hermes config check
docker compose exec hermes hermes doctor
```

Required:

- no context-length rejection;
- no custom-provider/base-URL error;
- no credential/substitution error relevant to the local model.

### 17.7 Hermes end-to-end tool test

Open an interactive Hermes process using the same persistent data/config:

```bash
docker compose exec hermes /opt/hermes/.venv/bin/hermes
```

Prompt:

```text
Use the terminal tool to run: printf HERMES_LLAMA_OK
Return the command output.
```

**Pass:** Hermes emits a real tool call, runs it, receives the tool result, and returns:

```text
HERMES_LLAMA_OK
```

**Fail:** it merely says it would run the command.

Repeat with several tool types actually required by your Paperclip roles.

### 17.8 Hermes API-server test from the application network

From a temporary container on `paperclip-app`:

```bash
cd /opt/paperclip-ai

HERMES_KEY="$(grep '^HERMES_API_SERVER_KEY=' .env | cut -d= -f2-)"

docker run --rm \
  --network paperclip-app \
  curlimages/curl:latest \
  -sS http://hermes:8642/v1/models \
  -H "Authorization: Bearer ${HERMES_KEY}"

unset HERMES_KEY
```

This proves the same path Paperclip will use.

### 17.9 Real Paperclip smoke test

After the previous gates pass, connect one non-critical Paperclip agent/profile and run a harmless task that requires at least one actual Hermes tool call.

Only then expand to additional profiles/jobs.

---

## 18. Resource and performance acceptance

While representative Hermes jobs run:

```bash
watch -n 1 'free -h; echo; docker stats --no-stream paperclip-llama paperclip-hermes'
```

After the test:

```bash
free -h
docker stats --no-stream
journalctl -k --since "30 minutes ago" | grep -Ei 'out of memory|oom|killed process' || true
```

### Required go/no-go rules

Qwen3.5-9B is accepted only if:

1. No OOM kill.
2. No llama-server crash/restart/unexpected EOF.
3. No Hermes connection reset caused by model-server instability.
4. Structured tool calls pass repeatedly.
5. End-to-end Hermes tool loops pass repeatedly.
6. Host `MemAvailable` remains comfortably above the failure floor under realistic work.
7. Paperclip/Hermes responsiveness outside inference remains acceptable.
8. Generation latency is acceptable for the actual business workflow.

### Record real performance

llama-server response data and `/metrics` expose prompt and generation timing/throughput. Record at least:

```text
Cold model load time:
Warm simple TTFT:
Prompt processing tokens/s:
Generation tokens/s:
Peak llama-server RAM:
Peak Hermes RAM:
Lowest host MemAvailable:
```

These measured numbers become the production baseline. Generic Internet benchmarks do not override them.

---

## 19. Concurrency policy

### Production baseline

```text
--parallel 1
--ctx-size 65536
```

This means one inference slot gets the full configured context budget.

### Why not start at parallel 2

With parallel decoding, total KV/context capacity is shared across slots. To preserve roughly 64K per active Hermes request at two simultaneous slots, the server would need approximately twice the total context budget, which materially increases memory while the two generations also compete for the same eight vCPUs.

The likely result on this host is lower per-request speed and less RAM headroom.

### When to test parallel 2

Only test it if production measurements show that queueing—not model quality or individual speed—is the actual bottleneck.

Staging-only candidate:

```text
--parallel 2
--ctx-size 131072
```

Then repeat the **entire** acceptance suite and compare:

- lowest host MemAvailable;
- per-request tokens/s;
- overall requests/minute;
- TTFT under two simultaneous requests;
- Paperclip queue latency;
- tool-call correctness.

Do not infer that “2 parallel” is faster just because two jobs are active at once.

---

## 20. Optional emergency swap safety net

The VPS currently has zero swap. A small swapfile can make a transient host-wide spike less likely to trigger an immediate kernel OOM kill.

This is **safety equipment**, not LLM memory.

Example 4 GiB emergency swap:

```bash
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi

swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

cat > /etc/sysctl.d/99-paperclip-ai.conf <<'EOF'
vm.swappiness=10
EOF

sysctl --system
free -h
```

If llama-server routinely pushes active inference pages into swap, the deployment fails capacity sizing even if it avoids an OOM kill.

---

## 21. Model residency and startup behavior

There is no Ollama-style keep-alive/model-switch policy.

`llama-server` starts with exactly one GGUF and keeps that model resident while the container runs.

Benefits:

- no first-request model reload after idle periods;
- no model-selection races;
- no second resident local model;
- predictable memory footprint;
- all Hermes profiles share one inference process;
- easier performance monitoring and failure diagnosis.

Do not enable llama-server’s multi-model router or idle model-unloading feature in this baseline.

---

## 22. Vision policy

Qwen3.5-9B is multimodal upstream, but the baseline intentionally deploys **text/tool inference only**.

Reason: llama.cpp vision with the GGUF requires the matching multimodal projector, adding another artifact and more memory/runtime surface. Hermes tool reliability is more important than adding vision before the text-agent path is proven stable.

If local vision is later required:

1. Download the matching projector from the **same GGUF repository/version**.
2. Mount it alongside the model.
3. Add the appropriate `--mmproj` argument to llama-server.
4. Mark/configure Hermes vision support as required by the then-current Hermes version.
5. Repeat image, memory, tool-call, and Paperclip acceptance tests.

Do not mark the baseline deployment as locally vision-capable.

---

## 23. Hermes resource configuration

The official Hermes Docker guidance calls for moderate resources and notes that browser automation is particularly memory-hungry.

Baseline container guards:

```yaml
shm_size: "1gb"
mem_limit: 4g
```

The 1 GiB `/dev/shm` size is useful for Chromium/browser automation; it is not 1 GiB of permanently reserved physical RAM.

If a Paperclip role does not need browser automation, disable unnecessary toolsets in Hermes rather than keeping heavy capabilities active by habit.

Do not compensate for a runaway Hermes workload by taking memory from llama-server until you identify the actual process/tool causing growth.

---

## 24. Security rules

### llama-server

- private `internal: true` Docker network;
- no host `ports:` mapping;
- API key enabled;
- Web UI disabled;
- llama-server built-in tools/agent/MCP features remain disabled;
- model directory mounted read-only.

Hermes owns agent tools. llama-server should remain an inference engine.

### Hermes API server

- bearer key required;
- not published publicly by this Compose baseline;
- no CORS by default;
- Paperclip calls it over `paperclip-app`.

Because Hermes can execute tools, its API key must be treated as a high-value credential.

### Docker socket

Do not bind-mount `/var/run/docker.sock` into Hermes merely because the official image includes `docker-cli`. That gives the agent powerful control over the host Docker daemon. Only add it if a specific Paperclip/Hermes workflow genuinely requires host Docker control and the security consequences have been accepted.

---

## 25. Version freezing after acceptance

Using mutable tags is acceptable only during the initial staging test:

```text
ghcr.io/ggml-org/llama.cpp:server
nousresearch/hermes-agent:latest
```

Once the complete acceptance suite passes, record exact image digests:

```bash
docker image inspect ghcr.io/ggml-org/llama.cpp:server \
  --format '{{index .RepoDigests 0}}'

docker image inspect nousresearch/hermes-agent:latest \
  --format '{{index .RepoDigests 0}}'
```

Replace the mutable tags in `compose.yaml` with exact digest references:

```text
image: repository/image@sha256:...
```

Production must not silently follow `latest` after acceptance.

Record the accepted deployment in a simple release note, including:

```text
Date:
llama.cpp image digest:
Hermes image digest:
GGUF filename:
GGUF SHA256:
Context:
Parallel slots:
Reasoning mode:
Prompt tokens/s:
Generation tokens/s:
Peak RAM:
Lowest MemAvailable:
Acceptance result:
```

---

## 26. Update policy

For any llama.cpp, Hermes, model/GGUF, context, KV type, or reasoning change:

1. Do not update production first.
2. Preserve the current Compose/config and accepted GGUF.
3. Pull/download the candidate separately.
4. Validate model checksum/artifact identity.
5. Run llama-server health test.
6. Run direct text test.
7. Run at least ten structured tool-call tests.
8. Run Hermes config/doctor checks.
9. Run repeated Hermes end-to-end tool loops.
10. Run Paperclip smoke test.
11. Measure RAM and CPU.
12. Compare prompt/generation throughput to the accepted baseline.
13. Promote only if the candidate is equal or better on required behavior.
14. Update this SSOT if the production contract itself changed.

A newer version number is not sufficient reason to promote a runtime.

---

## 27. Rollback

Before every production change:

```bash
cd /opt/paperclip-ai

cp compose.yaml compose.yaml.bak.$(date +%Y%m%d-%H%M%S)
cp hermes/config.yaml hermes/config.yaml.bak.$(date +%Y%m%d-%H%M%S)
cp hermes/.env hermes/.env.bak.$(date +%Y%m%d-%H%M%S)
```

Keep the previous accepted image digests and model file.

Rollback:

```bash
docker compose down
docker compose up -d
```

after restoring the previous accepted Compose/config.

Do not delete the known-good GGUF as part of an upgrade test.

---

## 28. Operational commands

### Status

```bash
cd /opt/paperclip-ai
docker compose ps
free -h
```

### Recent logs

```bash
docker compose logs --tail=200 llama-server
docker compose logs --tail=200 hermes
```

### Live logs

```bash
docker compose logs -f llama-server hermes
```

### Resource use

```bash
docker stats --no-stream paperclip-llama paperclip-hermes
```

### llama-server health

```bash
docker compose exec hermes curl -sf http://llama-server:8080/health
```

### Restart only inference

```bash
docker compose restart llama-server
```

### Restart only Hermes

```bash
docker compose restart hermes
```

### Stop without deleting data/models

```bash
docker compose stop
```

### Start again

```bash
docker compose start
```

### Recreate after a pinned image/config change

```bash
docker compose up -d --force-recreate
```

---

## 29. Failure diagnosis order

If Paperclip/Hermes fails to get a response, diagnose in this order rather than changing multiple settings at once.

### Layer 1 — host

```bash
free -h
uptime
journalctl -k --since "15 minutes ago" | grep -Ei 'out of memory|oom|killed process' || true
```

### Layer 2 — containers

```bash
docker compose ps
docker stats --no-stream paperclip-llama paperclip-hermes
```

### Layer 3 — llama-server health

```bash
docker compose exec hermes curl -sf http://llama-server:8080/health
```

### Layer 4 — llama-server OpenAI API

Run the direct `LLAMA_OK` test.

### Layer 5 — structured tool parsing

Run the fake `get_server_status` test and inspect `message.tool_calls`.

### Layer 6 — Hermes config/provider

```bash
docker compose exec hermes hermes config check
docker compose exec hermes hermes doctor
```

### Layer 7 — Hermes tool loop

Run the `printf HERMES_LLAMA_OK` terminal-tool test.

### Layer 8 — Hermes API server

Query `http://hermes:8642/v1/models` from `paperclip-app`.

### Layer 9 — Paperclip

Only after all lower layers pass should Paperclip orchestration/configuration be treated as the likely fault domain.

This order prevents “fixing” a Paperclip problem by changing model settings or “fixing” a llama-server problem by changing Hermes prompts.

---

## 30. Anti-drift rules

The following are **not** part of this production baseline:

- Ollama.
- Open WebUI.
- A second local LLM.
- llama-server router/multi-model mode.
- One llama-server per Hermes profile.
- One Hermes container per profile without a specific isolation requirement.
- Qwen 27B or a larger local model on this VPS.
- Context below 64K for Hermes.
- Full 262K context just because the model supports it.
- `--parallel 2+` without staged capacity testing.
- Thinking/reasoning enabled before structured tool-call reliability is proven on the exact candidate build.
- Public exposure of llama-server port 8080.
- llama-server built-in agent/tools/MCP features.
- llama-server Web UI.
- Automatic image updates after production acceptance.
- Treating swap as extra model RAM.
- Local vision unless the matching projector is intentionally added and tested.
- Mounting the Docker socket into Hermes by default.

Any change to these rules is an architecture change and requires updating this SSOT.

---

## 31. Final production definition

The deployment is considered architecturally correct when it has exactly this shape:

```text
                           VPS: vmi3208447
                       8 EPYC vCPU / 23 GiB RAM
                                  |
                  +---------------+---------------+
                  |                               |
           paperclip-app                    ai-inference
            Docker network                internal network
                  |                               |
             +----+----+                          |
             |         |                          |
         Paperclip   Hermes ----------------------+
                      |
                      | one official container
                      | one or more s6-supervised profiles
                      | profile roles share one local LLM
                      v
                 llama-server
                 one container
                 one model
                 one slot
                 ctx 65,536
                 Q8 KV cache
                 reasoning OFF
                 Web UI OFF
                      |
                      v
              Qwen3.5-9B Q4_K_M
              one resident GGUF
```

**Primary operating principle:** many logical agents may share the platform, but there is one local intelligence model and one local inference process. Reliability, structured tool-call correctness, predictable RAM usage, and measurable queueing behavior take priority over model multiplicity or theoretical parallelism.

---

## 32. Production acceptance checklist

- [ ] Obsolete Docker stacks stopped/removed; clean `free -h` baseline recorded.
- [ ] GGUF downloaded and checksum verified/frozen.
- [ ] Compose secrets created with restrictive permissions.
- [ ] `hermes/.env` created for default profile API server.
- [ ] Hermes config uses `provider: custom` and `http://llama-server:8080/v1`.
- [ ] Hermes context is exactly 65,536.
- [ ] llama-server context is exactly 65,536.
- [ ] llama-server `--parallel 1`.
- [ ] Q8_0 K/V cache.
- [ ] `--jinja` enabled.
- [ ] `--reasoning off` enabled.
- [ ] llama-server Web UI disabled.
- [ ] llama-server port not published to host.
- [ ] llama-server API key enabled.
- [ ] Hermes API key enabled.
- [ ] `docker compose config` passes.
- [ ] llama-server becomes healthy.
- [ ] `/v1/models` reports `qwen3.5-9b`.
- [ ] Direct `LLAMA_OK` test passes.
- [ ] Structured fake-tool test passes at least 10 consecutive runs.
- [ ] `hermes config check` passes.
- [ ] `hermes doctor` passes.
- [ ] Hermes terminal-tool loop passes repeatedly.
- [ ] Paperclip-network Hermes API test passes.
- [ ] Real Paperclip smoke test passes.
- [ ] No OOM/kernel kill.
- [ ] RAM headroom passes policy.
- [ ] Actual TTFT/tokens-per-second recorded.
- [ ] Runtime latency judged acceptable.
- [ ] Accepted container image digests pinned.
- [ ] Backup/rollback files preserved.

Only after every required item passes should this stack be marked **Production Accepted**.

---

## 33. Documentation reviewed for this SSOT

Reviewed against current documentation/source on 2026-08-14:

### Hermes Agent

- Docker deployment and persistent `/opt/data` model.
- s6-supervised gateway/container behavior.
- current one-container/multi-profile recommendation.
- per-profile API-server port behavior.
- Custom & Self-Hosted LLM Provider documentation.
- 64K minimum context requirement for tool/agent use.
- configuration precedence/environment substitution.
- reasoning controls and custom-provider behavior.
- tool-use enforcement.
- context compression and tool-loop guardrails.
- API server authentication and environment variables.
- local provider timeout behavior.

### llama.cpp

- `llama-server` OpenAI-compatible endpoints.
- `--ctx-size`, `--parallel`, thread, KV-cache, Jinja, reasoning, UI, auth, metrics, and timeout options.
- OpenAI-style function/tool calling documentation.
- official `ghcr.io/ggml-org/llama.cpp:server` Docker image.
- official `/health` behavior.
- current Qwen3.5 reasoning/tool-call issue reports.

### Qwen / GGUF

- official `Qwen/Qwen3.5-9B` model configuration and Apache-2.0 license.
- native 262,144-token text context declaration.
- selected `unsloth/Qwen3.5-9B-GGUF` Q4_K_M artifact and size/checksum metadata.

---

## 34. Change control

This file is the SSOT. Do not maintain a second competing “final” deployment document.

When production acceptance is completed, update the header with:

```text
Status: Production Accepted
Accepted date: YYYY-MM-DD
llama.cpp image digest: ...
Hermes image digest: ...
GGUF SHA256: ...
Measured generation tokens/s: ...
Measured prompt tokens/s: ...
Lowest MemAvailable: ...
```

Any later architecture change must update this file in the same change set.
