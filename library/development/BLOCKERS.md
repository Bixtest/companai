# Blockers — anything stopping progress

**What this is.** Anything that **stops work** or would force it **out of the right order** —
reported here the moment it is found, so it never sits silently in my head. **Read this before
wondering why something is not moving.**

**The rule:** a blocker is reported the same way a question is — in plain English, with **what
clears it** and **whose move it is**. If the move is the owner's, it says so.

**Checked:** 2026-10-04, 16:30. **Every blocker is re-checked each session** — a blocker is a
claim about now, not about last time.

**Open right now: 5** — B-04 (the Docker engine is down, and only the owner can start it), B-05
(OpenCode is load-bearing), B-15 half 2 (why the seeding transaction aborts), B-16 (no embeddings
endpoint), B-17 (no audit trail of agent tool calls). Of these, **only B-04 stops work today.**

**Fixed 2026-10-04 and moved to the Resolved table:** B-01, B-02, B-03, **B-15 half 1** (a failed
database init was reported as success — the entry was re-scoped after the recorded diagnosis turned
out to be wrong), the compose that started the app after a failed init, and a dead failure guard in
`dev-entrypoint.sh`.

| Tag | Meaning |
|---|---|
| 🔴 | **OPEN** — work is stopped or will be |
| 🟡 | **CLEARING** — a plan exists; not yet done |
| 🟢 | **RESOLVED** — kept for the record |

---

## Open blockers

### 🔴 B-04 — the Docker engine is not running, and **the agent cannot start it**

**What.** Measured 2026-10-04, 15:55. The Docker **client** is installed (29.8.1) but the
**engine** is down: `docker version` cannot reach the server —
`npipe:////./pipe/dockerDesktopLinuxEngine` is not found. `com.docker.service` is `Stopped`;
no `Docker Desktop.exe` / `com.docker.backend` process is running; Docker's own
`settings-store.json` has `"AutoStart": false`, so this is the normal state after a reboot,
not a fault.

**Why it blocks.** Every build step needs the engine — `docker compose up`, pulling images,
building the app image. Note the trap: `docker compose config` **parses without the engine**,
which is why a "the stack parses" check passes while nothing can actually run.

**What clears it.** **The owner starts Docker Desktop** (double-click it, or from the Start
menu / tray) and waits for it to report ready; then `docker version` prints a `Server:` block.

**Whose move.** The owner's — and only the owner's. **The agent cannot do it.** Measured
2026-10-04: `docker desktop start` fails because Docker Desktop's startup path invokes
**`wsl.exe`, which this machine's security policy blocks** for any program the agent launches:

```
PROGRAM BLOCKED BY SECURITY POLICY - the sandbox prevented a program on the configured
Program Blacklist from starting:
  - wsl.exe (C:\WINDOWS\System32\wsl.exe)
```

That block is not approvable and must not be worked around. It applies to the agent only —
Docker Desktop started by the owner is unaffected. **So "start Docker Desktop" is a permanent
owner step, not a one-off.** Recorded here so a later session does not read it as the agent
having failed.

**Optional, so this stops recurring:** turn on *Settings → General → Start Docker Desktop when
you sign in*, which is what `AutoStart: false` currently disables.

---

### 🟠 B-05 — OpenCode cannot be removed in Sprint 0: the platform's own chat is built on it

**What.** Decision **A1** said "remove the `opencode` service". The check (step 3.6) was run on
2026-10-04 and it **failed** — the platform's AI Assistant chat depends on it:

- `packages/ai-assistant/src/modules/ai_assistant/api/chat/route.ts` imports `createOpenCodeClient`
  and `opencode-handlers`.
- `lib/opencode-handlers.ts` calls `process.env.OPENCODE_URL ?? 'http://localhost:4096'`.
- `api/health/route.ts` uses `handleOpenCodeHealth`.

So deleting the service **breaks the platform's built-in AI chat** — it is not an unused service.

**Why it blocks.** It does not block the trio (Sprint 0 can still run). It blocks **step 3.6**, and
it corrects A1's *execution*.

**What clears it.** Do **not** remove OpenCode in Sprint 0 — keep it, per A1's own clause *"if
anything depends on it, it stays, switched off, and this note says why."* Removal needs a
prerequisite first: **rewire the platform chat to the app's own LLM registry** (`model-factory.ts`
+ `llm-provider-registry` already exist), *then* delete the service. That is a code migration, not a
compose edit. Tracked as **N-8** in [`BACKLOG.md`](BACKLOG.md).

**Note — two different "opencodes".** The legacy `OPENCODE_*` **env vars** are only back-compat
aliases for the LLM provider (see `model-factory.ts`), and *can* be dropped independently. The
`opencode` **service** is the one that is load-bearing.

**Whose move.** Mine, later; it is a code migration.

---

### 🟡 B-15 — `mercato init` fails partway through

**What.** On the first real initialisation, `mercato init` creates the three users
(`superadmin@acme.com`, `admin@acme.com`, `employee@acme.com`), then dies:

```
🎛️  Seeding feature toggle defaults...
✅ Created feature toggle feature_toggles_ui
❌ Initialization failed: current transaction is aborted, commands ignored until end of transaction block
```

**Two halves, and they have different owners.**

**Half 1 — the failure was being reported as success. FIXED 2026-10-04.** It is no longer possible
to get a half-seeded database with a marker claiming it is fine. See the corrected diagnosis below.

**Half 2 — *why* the feature-toggle seeding transaction aborts. STILL OPEN.** The underlying SQL
error is not in the app log; it has to be reproduced with the transaction error surfaced, and that
needs the Docker engine (**B-04**). This half does not block the trio.

**Whose move.** Mine, when the engine is up.

---

#### The corrected diagnosis — the earlier record here was wrong

This entry used to say *"`mercato init` printed `❌ Initialization failed` yet **exited 0**"*.
**That is false, and it pointed the fix at the wrong file.** Two independent routes agree:

- **Source.** `packages/cli/src/mercato.ts:1322-1324` — the catch logs the message and `return 1`;
  and `packages/cli/src/bin.ts` ends with `process.exit(code ?? 0)`. The CLI **does** exit 1.
- **The CLI's own tests.** `packages/cli/src/__tests__/mercato.test.ts:373` and `:419` both assert
  `expect(exitCode).toBe(1)` for a failed init.

The real defect was in `docker/scripts/init-or-migrate.sh`, and it is a classic shell trap:

```sh
if sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1; then
  return 0
fi
STATUS=$?          # <-- always 0
```

The exit status of an `if` with no `else` whose condition failed is **0**, so `STATUS` was always 0
and `run_command_with_cli_recovery` **reported every failure as success**. Measured directly:
`sh -c 'exit 7'` inside that shape captures `0`, in both `sh` and `bash`. The same mistake appeared a
second time at the bottom of the script, where a failed migration also exited 0.

**Three defects were fixed, all measured 2026-10-04:**

| # | Where | Defect | Now |
|---|---|---|---|
| 1 | `docker/scripts/init-or-migrate.sh` | `STATUS=$?` read after `fi` → every failure reported as success, marker written anyway | all three sites now `STATUS=0; cmd \|\| STATUS=$?` |
| 2 | `docker-compose.fullapp.yml`, `packages/create-app/template/docker-compose.fullapp.yml` | init ran unchecked, so `yarn start` followed a failed init and the app looked healthy | init is now checked; on failure it prints why and exits 1 **without** starting the app |
| 3 | `docker/scripts/dev-entrypoint.sh` | `run_setup()` began with `set -e`, but it is called as `if ! (run_setup)` — and **errexit is ignored for a function invoked as a condition**, so the guard never fired and the failure banner below it was dead code | each step is now checked explicitly with `\|\| return 1` |

**Note on defect 3:** the same `set -e`-in-a-function trap was measured in both `sh` and `bash`
(`if ! (f)` with `f() { set -e; false; ...; }` does **not** abort). The file's own comment claimed the
opposite. Do not reintroduce `set -e` there.

**Two tests, neither needing Docker** (both are in `docker/scripts/__tests__/`):

```sh
sh docker/scripts/__tests__/init-or-migrate.test.sh
sh docker/scripts/__tests__/compose-init-guard.test.sh
sh docker/scripts/__tests__/compose-init-guard.test.sh packages/create-app/template/docker-compose.fullapp.yml
```

Both were **mutation-proven** — run against the unfixed code first, to show they fail:

| | before the fix | after the fix |
|---|---|---|
| `init-or-migrate.test.sh` | **7 passed, 3 failed** | **10 passed, 0 failed** |
| `compose-init-guard.test.sh` | **3 passed, 3 failed** | **6 passed, 0 failed** |

**The recorded fix was also re-scoped, deliberately.** It said to treat "a non-zero **or a printed
failure**" as failure. With the exit status now correct, matching on printed text is redundant — and
worse, the string `❌ Initialization failed:` also wraps the *"database already has users"* message,
which must be treated as **success**. A text match would have broken that recovery path. So the fix
is the status capture only, and the tests pin the already-seeded path as a success.

---

### 🟡 B-16 — the MCP's tool-search index cannot be built (no embeddings endpoint)

**What.** On startup the MCP logs:

```
Error: Failed to index 21 tools: Bulk indexing failed for 1 strategy(ies):
vector ([vector.embedding] Invalid OpenAI API key. Update the key and retry.)
```

The vector strategy needs an embeddings endpoint. Our local model server (llama.cpp) serves
`/v1/chat/completions` but **no `/v1/embeddings`**, and the configured key is the placeholder `local`.

**Why it blocks.** Nothing critical: the MCP starts, and all **21 tools register and are callable**
(proven — see the resolved table). Only *semantic search over tools* is degraded; the fulltext strategy
still indexes.

**What clears it.** Either serve embeddings locally (a second llama.cpp instance with an embedding GGUF,
e.g. `nomic-embed-text`), or point `vector.embedding` at a provider that has one. A Sprint-0-adjacent
decision, not a code change.

**Whose move.** Mine, later.

---

### 🟡 B-17 — there is no database audit trail of agent tool calls

**What.** Sprint 0's "done when" asks that an agent's tool call be **"visible in the ledger"**. It is
not — not in the database. Measured 2026-10-04, after a **successful authenticated** `tools/call` to
`context_whoami` (HTTP 200, real tenant/user data returned, and the MCP logged
`Tool call received … Tool call succeeded`):

| Check | Result |
|---|---|
| `api_keys.last_used_at` for `__mcp_server__` | **still NULL** |
| `action_logs` rows | **1** — and it is the *`mercato init` feature-toggle write*, not the call |
| `access_logs` rows | **0** |
| MCP server stdout | the **only** record of the call |

Two separate facts, both worth knowing:

1. **A read-only tool writes no `action_logs` row.** That table records *commands* — mutations, each
   with an `undo_token` and a `snapshot_before/after`. `context_whoami` performs no command, so
   nothing is written. That is arguably correct behaviour, but it means "the ledger" does not
   answer *"what did the agent look at?"*
2. **The platform does not record API-key usage at all.** `last_used_at` was not updated by a
   successful authenticated request. So there is no way to answer *"which key was used, when, and
   how often?"* from the database.

**Why it blocks.** It does not stop the trio. It blocks **the audit story** — and this is a
compliance product, where "the agent did X" being unanswerable is the defect, not a nice-to-have.

**What clears it.** Decide what the audit requirement actually is, then implement it: update
`last_used_at` on every authenticated MCP request, and record tool invocations (including read-only
ones) somewhere queryable. A product decision first — tracked as a backlog item rather than a fix.

**Whose move.** Mine, later — it needs the requirement settled before the code.

---

## Not blockers, but worth knowing

- **Docker is installed but its engine must be running.** Measured 2026-10-04: client **29.8.1**,
  Compose **v5.5.1**. Sprint 0 is *not* waiting on an install — it is waiting on **Docker Desktop
  being started**, which only the owner can do (see **B-04**). Do not mistake a passing
  `docker compose config` for a running engine.
- **Postgres is not running on the host** (nothing listening on 5432). That is fine — the
  compose stack provides its own Postgres, so nothing needs installing on Windows.
- **Building the platform image is slow** (a Next.js app; several minutes and a multi-GB image).
  Slow is not blocked — it just needs to be run in the background, not watched.
- **The admin password is the owner's, and he types it.** Standing arrangement, not a defect: the
  password is **never written to a file and never typed into a form by the agent**. Anything that
  needs clicking through the running platform needs him at the keyboard. The arrow-(1) proof was
  taken from container logs, the MCP's own tool list and the database, so no login was needed.
- **`sh -lc` is slow on this machine — about 20 seconds per call.** Both shell tests invoke the
  script under test, which uses `sh -lc` internally, so `init-or-migrate.test.sh` takes **~150 s**
  to run and will exceed a 2-minute command timeout. That is slowness, not a hang; give it a longer
  timeout rather than killing it. (In the Linux container this cost disappears.)
- **The two Docker-free tests live in `docker/scripts/__tests__/`** and are the fastest way to
  check the database-readiness logic without starting anything:

  ```sh
  sh docker/scripts/__tests__/init-or-migrate.test.sh
  sh docker/scripts/__tests__/compose-init-guard.test.sh
  sh docker/scripts/__tests__/compose-init-guard.test.sh packages/create-app/template/docker-compose.fullapp.yml
  ```

  They must be run with **`sh`** and are safe to run at any time — no database, no containers, and
  they only write inside a scratch directory under `/tmp`.

---

## Resolved

| # | Was | Cleared by |
|---|---|---|
| 🟢 | **The object list was unknown** (30 / 33 / 34) — it blocked the Business Model Kernel specification | Decided 2026-10-04: start from the **union of 36**, prune in the spec |
| 🟢 | **Two agent runtimes** (opencode + Hermes) — a "second copy" | Decided 2026-10-04: **Hermes takes the agent slot.** OpenCode is **not yet removed** — that is blocked on rewiring the platform chat (**B-05**, **N-8**) |
| 🟢 | **B-01** — Hermes used `network_mode: host` | Cleared 2026-10-04: Hermes's official Docker guide uses **bridge networking + a published port**; the `hermes` service is written that way |
| 🟢 | **B-02** — the admin password is typed by the owner | Cleared 2026-10-04 as a *blocker*: the arrow-(1) proof was taken from the container logs, the MCP's own tool list and the database, so no login was needed. The standing arrangement itself continues — see "Not blockers" above |
| 🟢 | **B-03** — no local model file | Cleared 2026-10-04: `Qwen2.5-7B-Instruct-Q4_K_M.gguf`, 4,683,074,240 bytes, `GGUF` magic verified |
| 🟢 | **B-04 (first occurrence)** — Docker Desktop's engine was not running | Cleared 2026-10-04: the owner started it and the engine reported Server **29.8.1**. **It recurred the same day** — `AutoStart` is off, so the engine is down again whenever the machine restarts. It is open again above, now with the finding that the agent cannot start it |
| 🟢 | **B-15 half 1** — a failed database init was reported to its caller as success, so the "already seeded" marker was written and the app came up looking healthy on a half-seeded database | Fixed 2026-10-04. The recorded cause was **wrong** (the CLI does exit 1 — see the corrected diagnosis under **B-15**). The real cause was `STATUS=$?` read after `fi` in `init-or-migrate.sh`, where the status of an `if` with no `else` is always 0. Fixed at all three sites, in **both** copies of the script. Half 2 (why the seeding transaction aborts at all) is still open |
| 🟢 | **The compose started the app after a failed init** | Fixed 2026-10-04 in `docker-compose.fullapp.yml` **and** `packages/create-app/template/docker-compose.fullapp.yml`: the init step is now checked, and on failure the block prints why and exits 1 **without** running `yarn start`. Mutation-proven — the guard test fails 3 cases against the old text and passes 6 against the new |
| 🟢 | **`dev-entrypoint.sh`'s failure guard was dead code** | Fixed 2026-10-04. `run_setup()` opened with `set -e`, but the function is invoked as `if ! (run_setup)`, and **errexit is ignored for a function invoked as a condition** — so a failing `yarn install` / `build` / `generate` / `init` fell through, the function ended on a successful `cd`, and the "SETUP FAILED" banner below never printed. Measured in both `sh` and `bash`. Each step is now checked with `\|\| return 1` |
| 🟢 | **B-06** — the app image would not build: `/packages/enterprise/package.json: not found` | Cleared 2026-10-04: `packages/enterprise` was deleted as **commercially licensed** (commit `7f9fa5d`) but the removal was **incomplete** — it left **3 Dockerfile `COPY` lines** and a `lint:ds` reference behind. All removed; verified nothing depends on the package (no `package.json`, clean `yarn.lock`) |
| 🟢 | **B-07** — the app image then failed with `failed to stat active key during commit: snapshot ... does not exist` (a BuildKit error, *not* a Dockerfile error) | Cleared 2026-10-04. **Root cause was ours:** the 4.7 GB GGUF was downloaded into `models/` **inside the build context**, and `.dockerignore` did not exclude it — so every build shipped 4.7 GB into the builder and the layer commit failed. Isolated with a trivial `FROM alpine` build (which **worked**, proving BuildKit was fine). Fixed by adding `models/` + `*.gguf` to `.dockerignore`. A red herring along the way: Avast (installed here) is a known cause of this error, but it was not the cause |
| 🟢 | **B-08** — the app image failed in `next build` with `CssSyntaxError: /app/apps/mercato/src/app/globals.css:2:45097: Missed semicolon`, the CSS full of control characters | Cleared 2026-10-04. **Evidence chain:** (1) the source class (`packages/core/.../MobileTaskForm.tsx`) is **clean** — 0 non-ASCII bytes; (2) a probe build proved the file survives `COPY` **intact**; (3) the corruption is **non-deterministic** — the *same* class came out corrupted *three different ways in one build*; (4) the **host's Turbopack cache** (`apps/mercato/.mercato/next`) **contains the corrupted bytes** — 25 files matched, 464 of 14,918 are non-UTF8; (5) `.dockerignore` excluded `.next` but **not** `.mercato/next`, so that junk was **shipped into the image**, and `.gitignore` is *also* excluded from the image, so **Tailwind v4's source auto-scan read those binary cache files as CSS** and emitted garbage class names. **Fixed** by excluding `apps/mercato/.mercato` from the build context. *(Latent defect in the kit: it bites whenever someone builds on a machine that has a local dev cache.)* |
| 🟢 | **The security confirmations** (secrets, RLS, model default) were pending | Confirmed 2026-10-04 |
| 🟢 | **B-09** — the app container crash-looped: `Cannot find module 'C:/Program Files/WorkBuddyAI/…/node-language-shim.cjs'` | Cleared 2026-10-04. The compose read `NODE_OPTIONS: ${NODE_OPTIONS:-…}`, which takes the **host's** value when set — and this machine exports a Windows-only preload path. Confirmed by three independent routes (host shell, `docker compose config`, `docker inspect` of the live container). The `mcp` service was immune because it reads a *distinct* name (`MCP_NODE_OPTIONS`). Fixed by renaming to `APP_NODE_OPTIONS`. **Never use `${NODE_OPTIONS:-…}` in a compose file.** |
| 🟢 | **B-10** — the database had **0 users** while the init marker claimed it was seeded | Cleared 2026-10-04: the marker was **false** (see **B-15**). Deleted it and restarted; `mercato init` then ran and created `superadmin@acme.com` / `admin@acme.com` / `employee@acme.com` — verified in `public.users`. |
| 🟢 | **B-11** — Hermes state lived on a Windows bind mount, which Hermes warns "can silently corrupt the database" | Cleared 2026-10-04: moved to a named volume (`mercato-hermes-data-local`) — the fix Hermes' own message names. **0 cross-VM warnings** afterwards; `state.db` safely in WAL. Also stopped Sprint 0 writing into the owner's personal `~/.hermes`. Checked for damage: his `config.yaml` was **unchanged** except Hermes appending `gateway: multiplex_profiles: true`. |
| 🟢 | **B-12** — a hand-written Hermes `config.yaml` is silently discarded | Cleared 2026-10-04: Hermes **owns and rewrites** that file. Configure it only through its own CLI (`hermes config set`, `hermes mcp add`). |
| 🟢 | **B-13** — Hermes could not authenticate to the platform's MCP: HTTP 401 `{"error":"API key required (x-api-key header)"}` | Cleared 2026-10-04. `lib/auth.ts:157-192` accepts exactly **`x-api-key: <secret>`** or **`Authorization: ApiKey <secret>`**. Hermes' `mcp add --auth header` writes `Authorization: Bearer …` — **neither** form. Fixed by adding the `x-api-key` header. **Arrow (1) transport proven:** `hermes mcp test mercato` → `✓ Connected (2567ms)`, `✓ Tools discovered: 21`. |
| 🟢 | **B-14** — Hermes refused the local model: "context window of 32,768 tokens, which is below the minimum 64,000" | Cleared 2026-10-04. Hermes enforces `MINIMUM_CONTEXT_LENGTH = 64000` (`agent/agent_init.py::_enforce_minimum_context`). Adding `-c 65536` to llama.cpp was **not enough** — llama.cpp logged `the slot context (65536) exceeds the training context of the model (32768) - capping` and served `n_ctx_slot = 32768`. Fixed with YaRN RoPE scaling (`--rope-scaling yarn --rope-scale 2 --yarn-orig-ctx 32768`) → `n_ctx_slot = 65536`, plus `hermes config set model.context_length 65536`. |
