# Runbook — Sprint 0, "the running trio"

**One page. Start here.** What this brings up: the **platform**, its **MCP tool server**, a **local
model server**, and the **Hermes agent** — together, on one machine, with no cloud key. It proves two
things and nothing else: the agent can **do** things in the platform (arrow 1), and the agent can
**think** using a model on this machine (arrow 2).

The long version is [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md), "Sprint 0 — the
running trio". This page is the short one.

---

## Is the infrastructure ready? — checked 2026-10-05

**Short answer: built, proven, and running right now.** Eight containers are up and all healthy
(re-verified 2026-10-06), the app answers on `http://localhost:3000`, and the database initialised cleanly.

| Piece | State |
|---|---|
| The compose stack (`docker-compose.fullapp.yml`) | **Running — 8 containers up and all healthy**, measured 2026-10-06 after the redis restart-policy fix (app, mcp, hermes, model, opencode, postgres, redis, meilisearch). Proven working 2026-10-04: 8 services healthy, and Hermes discovered all **21** platform tools. **Caution:** on 2026-10-05/06 eight *rows* were present while `redis` had exited and `mcp` was unhealthy — `docker ps` counts rows, not health; read the **Status** column |
| The local model file | **Present** — `models/Qwen2.5-7B-Instruct-Q4_K_M.gguf`, 4.68 GB |
| `workspace/starting-kit/.env` | **Present** |
| Node 24 | **Inside the container only.** Measured 2026-10-04: this host has **Node 22.22.2** and **no yarn**, while the kit requires Node **24.x**. Nothing to install *for the stack* — the container carries both — but the host **cannot** run the codebase natively. See **N-11** in [`BACKLOG.md`](BACKLOG.md) |
| The database | **Provided by the stack, and clean** — 3 users, 1 tenant, 1 organisation, 5 feature toggles, 5 `action_logs` rows. Rebuilt from scratch on the fixed image 2026-10-05; the init ran every step green |
| Docker Desktop | **Running** — engine `29.8.1`. ✅ **Auto-start is ON** — the owner turned it on 2026-10-06, so a restart no longer leaves the stack down. ✅ **The one `unhealthy` container is explained and fixed (2026-10-06):** `mercato-mcp-local` was unhealthy because `mercato-redis-local` had exited (255) and the MCP's `depends_on: redis: service_healthy` never cleared — `redis` was the only service in the compose file without a `restart:` policy. Fixed with `restart: unless-stopped`; all 8 containers now healthy. Detail: [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) §"Sprint 0 — the re-run" |
| The Coolify server | A **separate** Hyper-V VM, not this stack — see [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md) |

**✅ RESOLVED 2026-10-06 — the owner turned Docker Desktop auto-start on, so this is no longer a
per-restart owner step.** The paragraph below is kept because the *agent* still cannot start Docker
Desktop: that part has not changed and never will, because it is a security-policy block. What changed
is that Docker Desktop now starts itself when the owner signs in.

**What the problem was.** Docker Desktop did not auto-start, so when the machine was restarted the whole
stack was down until the owner started it. Measured 2026-10-04:

```
$ docker desktop start
PROGRAM BLOCKED BY SECURITY POLICY - the sandbox prevented a program on the configured
Program Blacklist from starting:
  - wsl.exe (C:\WINDOWS\System32\wsl.exe)
```

Docker Desktop's startup path runs `wsl.exe`, and this machine's security policy blocks that for
anything the agent launches. The block is not approvable and must not be worked around. **So "start
Docker Desktop" is a permanent owner step *for the agent* — but it is no longer a step the owner has to
remember, because auto-start is now on.** Full detail: **B-04** in [`BLOCKERS.md`](BLOCKERS.md);
[`NEEDS-YOU.md`](NEEDS-YOU.md) item 6 is **done**.

> **Do not confuse "parses" with "runs".** `docker compose config` succeeds with the engine down, so
> a passing parse proves nothing about whether anything can start.

---

## Before you start

1. **Docker Desktop is running** — the *engine*, not just the app. `docker version` must print a
   `Server:` block. (A passing `docker compose config` does **not** prove the engine is up.)
2. **The model file exists:** `workspace/starting-kit/models/Qwen2.5-7B-Instruct-Q4_K_M.gguf`
   (~4.68 GB, gitignored — it is not in the repo).
3. **`workspace/starting-kit/.env` exists.** It holds the values that point the platform and Hermes
   at the local model. It is gitignored.

## Start

```bash
cd workspace/starting-kit
docker compose -f docker-compose.fullapp.yml up -d
```

The **first** run builds the platform image (several minutes, multi-GB) — run it in the background
and do not watch it. Later runs start in well under a minute, except the model server, which takes
**~60–90 seconds** to load the GGUF and allocate a 64K KV cache.

## Check it came up

```bash
docker compose -f docker-compose.fullapp.yml ps
```

Expect **8 services** `Up`. `postgres`, `redis`, `meilisearch` and `model` should read `(healthy)`.
The platform takes a minute or two to initialise and start its workers — `starting-kit-app-1` going
`Up` is *not* proof that it initialised (see "Known sharp edges" below).

```bash
# the platform answers
curl --noproxy '*' -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/     # expect 307 -> /login

# the MCP tool server answers, and lists its tools
docker exec mercato-mcp-local wget -q -O - http://127.0.0.1:3001/health
#   {"status":"ok","tools":21,...}
```

> **Always use `curl --noproxy '*'` on this machine** — `http_proxy` is set, and a proxied request to
> `127.0.0.1` returns a `502`, or worse a small `200` whose body is an error.

## Prove the two arrows

**Arrow (2) — the agent thinks locally, with no cloud key.** Ask the model server directly:

```bash
docker exec hermes-local /opt/hermes/.venv/bin/python -c "
import urllib.request, json
r = urllib.request.urlopen('http://model:8080/v1/models', timeout=15)
print('HTTP', r.status, [m['id'] for m in json.load(r)['data']])"
```

**Arrow (1) — the agent lists and calls a platform tool.** First the cheap check, which proves the
wire and the credentials:

```bash
docker exec hermes-local /opt/hermes/bin/hermes mcp test mercato
#   ✓ Connected (…ms)
#   ✓ Tools discovered: 21
```

Then a real agent turn. **This is slow — see "Known sharp edges".** Expect **20+ minutes** on this
laptop, CPU-only:

```bash
docker exec hermes-local /opt/hermes/bin/hermes --yolo -z \
  "Call the mercato MCP tool context_whoami with no arguments and print its raw JSON result."
```

## Stop / start again

```bash
docker compose -f docker-compose.fullapp.yml stop      # keep state
docker compose -f docker-compose.fullapp.yml down      # remove containers, keep volumes
docker compose -f docker-compose.fullapp.yml down -v   # ALSO delete the database — full reset
```

## The five things you will need to know

| | |
|---|---|
| **The MCP key** | Generated by the `mcp` service. Read it: `docker exec mercato-mcp-local cat /run/mcp-shared/mcp-api-key`. **Never set `MCP_SERVER_API_KEY`** — it does not set this key, and it makes `opencode` use the wrong one. |
| **The header** | `x-api-key: <key>` — **not** `Authorization: Bearer`. The server also accepts `Authorization: ApiKey <key>`. |
| **Hermes' config** | **Never hand-edit** `config.yaml`; Hermes owns and rewrites it. Use `hermes config set …` / `hermes mcp add …`, then `hermes config get` to read it back. The binary is `/opt/hermes/bin/hermes` (not on `PATH`). |
| **Ports** | Published on **127.0.0.1 only** by design: platform `3000`, model `8080`, Hermes `8642`. To expose them, set `APP_BIND` / `MODEL_BIND` / `HERMES_BIND` (e.g. `0.0.0.0`) in `.env`. |
| **Hermes state** | A **named volume** (`mercato-hermes-data-local`), not a host folder. A Windows bind mount is a cross-VM filesystem, where Hermes refuses WAL-mode SQLite and warns of silent corruption. |

## Known sharp edges

- **The agent loop is slow — budget an hour, not a minute.** Measured 2026-10-04, CPU-only:
  - Hermes' prompt is **~15,700 tokens** (its system prompt plus the 21 MCP tool schemas).
  - Prompt ingest runs at **~12 tokens/s and falls** as the context grows → **~20 minutes** just to
    read the prompt. Hermes **cancels and retries** partway through (`cancel task` in the model log);
    the retry reuses the cached prefix (`LCP similarity`, `f_keep ≈ 1.0`), so it makes progress
    rather than restarting from zero.
  - Generation is **~0.8 tokens/s** at that context size — a 100-token tool call takes ~2 minutes.
  - The model container uses **~10 GiB** of the Docker VM's 15.56 GiB.
  - **Use `hermes mcp test mercato` for the cheap proof** (seconds). Only run a full agent turn when
    you are willing to wait, and run it in the background.
  - The fix is **GPU offload** (the machine has a Quadro M2000M) or a **smaller tool surface** — the
    tool schemas are the bulk of the prompt.
- **`mercato init` can fail partway through.** It creates the users, then dies in feature-toggle
  seeding with `current transaction is aborted`. **FIXED 2026-10-04 — the failure is no longer
  hidden.** It used to be: `init-or-migrate.sh` lost the exit status (`STATUS=$?` read after `fi`,
  and the status of an `if` with no `else` is always 0), so it wrote its "already seeded" marker
  anyway, and the compose started the app regardless — a half-seeded database that looked healthy.
  Both are fixed and both have tests (below). **What is still open is *why* the seeding transaction
  aborts** — that is B-15 half 2. **If the database looks empty, check the marker:**
  `docker exec starting-kit-app-1 ls -la /tmp/init-marker/` — delete it and restart to force a real
  init. Tracked as **B-15** in [`BLOCKERS.md`](BLOCKERS.md).
- **The MCP's vector tool-search index does not build** (`Invalid OpenAI API key`). **Root-caused
  2026-10-05, and the old description was half the story:** that error text is **OpenAI's own code**,
  so the call never reached our server. The **`mcp` service is missing `OPENAI_BASE_URL`** (it is set
  for `app` and `opencode`, not for `mcp`) — which is where the tool-search index runs. The second,
  also-real defect is that the `model` service has no embedding model. All 21 tools still register
  and are callable; only semantic tool search is degraded. Tracked as **B-16**; full trace in
  [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §6.2.
- **The `model` service command now carries `--jinja`.** Hermes' own docs say llama.cpp needs it for
  native tool calling, and without it the server ignores the `tools` parameter. **Two caveats:** a
  study already in this repo reads it the other way (it says newer builds enable it by default), and
  the flag is free either way. **Settle it from the running server:**
  `curl -s http://model:8080/props | jq '.chat_template'` — a template, not `null`. See §4.1 of the
  same document.
- **OpenCode is still in the stack, deliberately.** The platform's own chat route is built on it, so
  removing it breaks the chat. See **B-05** / **N-8**. *(B-05's design face was **decided 2026-10-05**:
  what replaces it is a supervised private Hermes runtime behind the internal port, with Hermes
  headless. What is *not* decided is **when** OpenCode goes; that stays **N-8**.)*

## Check the database logic without starting anything

Two tests need **no Docker, no database and no yarn**. They run in a scratch directory under `/tmp`
and are safe at any time. Run them with **`sh`**:

```sh
sh docker/scripts/__tests__/init-or-migrate.test.sh
sh docker/scripts/__tests__/compose-init-guard.test.sh
sh docker/scripts/__tests__/compose-init-guard.test.sh packages/create-app/template/docker-compose.fullapp.yml
```

They pin the behaviour that keeps a failed initialisation from being mistaken for a good one: the
marker is written only on success, "database already has users" is still treated as success, and the
compose refuses to start the app after a failed init.

> **They are slow here — about 150 s for the first one.** The script under test calls `sh -lc`, and a
> login shell costs ~20 s on this machine. That is slowness, not a hang. Give it a longer timeout
> rather than killing it.
