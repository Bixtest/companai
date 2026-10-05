# Blockers — anything stopping progress

**What this is.** Anything that **stops work** or would force it **out of the right order** —
reported here the moment it is found, so it never sits silently in my head. **Read this before
wondering why something is not moving.**

**The rule:** a blocker is reported the same way a question is — in plain English, with **what
clears it** and **whose move it is**. If the move is the owner's, it says so.

**Checked:** 2026-10-05, 06:53. **Every blocker is re-checked each session** — a blocker is a
claim about now, not about last time.

**Open right now: 3** — B-05 (OpenCode is load-bearing), B-16 (no embeddings endpoint), B-17 (no audit
trail of agent tool calls). **None of the three stops Sprint 0** — they are all "the product cannot do
this yet", not "work is stuck".

**B-16 was traced to its root on 2026-10-05, and the recorded description was half the story.** The
error text is OpenAI's own `invalid_api_key`, so the request never reached our model server: the
**`mcp` service is missing `OPENAI_BASE_URL`**. The "no embeddings endpoint" half is also real, but it
is the *second* defect. Both are in the B-16 entry below, with the two routes that measured them.

**B-05 has two faces, and one of them closed on 2026-10-05.** The **design** face (which runtime
boundary, and how it is isolated) was **approved by the owner** on 2026-10-05: one product, one
repository, one deployment, one interface (ours), with Hermes as a supervised private runtime process
behind the internal port. The **blocker** face (OpenCode is still load-bearing, so it cannot be deleted
yet) is **unchanged and still open**, tracked as **N-8**. The decision is recorded in the B-05 entry
below and in [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) §11.

**Resolved 2026-10-05 — B-15 is now fully closed, both halves.** Half 2 was never a seeding bug. The
failing statement was read straight off the Postgres server and traced to a scope lookup in
`packages/core/src/modules/query_index/di.ts`; see *The real cause of the abort* under **B-15**.

**Resolved 2026-10-05 — B-18 is closed, re-measured this session rather than assumed.** The image *was*
rebuilt, the running containers *are* that image, and the fix is *inside the artefact that is running* —
not merely present in the source. Five measurements are recorded in the **B-18** row of the Resolved
table below. B-18 was the blocker that mattered: it is why the 2026-10-05 reset first produced a
half-seeded database that reported itself healthy.

**Cleared since the last check:** **B-04** — the owner started Docker Desktop and the whole stack
was verified running the same evening: 8 services, 7 healthy, 21 AI tools discovered, the app serving
on `http://localhost:3000`, loopback only. *(B-04 will recur on the next restart while `AutoStart` is
off — see [`NEEDS-YOU.md`](NEEDS-YOU.md) item 6.)*

**Everything that needs the owner is in one document: [`NEEDS-YOU.md`](NEEDS-YOU.md).** This file is
about what stops *work*; that file is the numbered action list.

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

**Decided 2026-10-05 — the design face, by the owner.** The owner approved the recommended runtime
boundary: **one product, one repository, one deployment, one interface (ours), with Hermes as a
supervised private runtime process behind the internal port.** Hermes is **headless**; the Starting Kit
owns every surface a user sees. Not a separately administered Hermes product, and not a literal single
process. Four independent readings of the source support it: Hermes' own integration guide (the
protocol table, and the only in-process option being a Python import), Hermes' own front-end shape
(including its Desktop client spawning its backend as a child process), Hermes' own live-session
hand-off lane, and our own `ARCHITECTURE.md` §5, **B-01** and Sprint 0's definition of done. The
reasoning, the owner's three challenges and the two hostile passes that corrected it are in
[`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) §11.

**What this does *not* close.** The `opencode` service is still load-bearing, so it stays until **N-8**
rewires the platform chat. The decision settles *what replaces it and how the replacement is shaped*,
not *when the old one goes*. It also does not decide the Hermes **profile** topology, which is
deferred with a named trigger (§11.2 of the same document).

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

**Two halves.**

**Half 1 — the failure was being reported as success. FIXED in the source 2026-10-04, and since
2026-10-05 genuinely present in the running image.** On 2026-10-05 the running `open-mercato/app:local`
image was measured to have been built **2026-10-04T03:08Z**, i.e. **before** the fix landed (commit
`1eddf11`, 2026-10-04 14:51Z). The container was therefore still executing the buggy script, which is
exactly why the 2026-10-05 database reset wrote the "already seeded" marker again while the init was
failing. Measured by diffing the script inside the container against the repo copy: the container's
`run_command_with_cli_recovery` still had `STATUS=$?` read after `fi`. **A source fix that is not built
is not a fix** — that was blocker **B-18**, now closed: the image was rebuilt 2026-10-05 06:29 +0200,
and the in-image `init-or-migrate.sh` now hashes `838969fe…`, byte-identical to the repo copy.

**Half 2 — *why* the feature-toggle seeding transaction aborts. SOLVED 2026-10-05.** The underlying
SQL error was never in the app log because the code catches it and says nothing; it was read straight
off the Postgres server instead. It was never a seeding bug. See *The real cause of the abort* below.

**Whose move.** Nobody's — both halves are now understood and the fixes are written.

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

**How many sites, exactly** (re-measured 2026-10-04 after an independent critic checked it): the
original script read `$?` in **four** places. **Two** were broken — the two read *after* an `fi` — and
the other two sat inside an `else` branch, where `$?` really is the failed condition's status, so they
were correct only by accident of where they were written. All four now use one explicit shape, so the
pattern cannot be reintroduced by copying a neighbouring line.

**Three defects were fixed, all measured 2026-10-04:**

| # | Where | Defect | Now |
|---|---|---|---|
| 1 | `docker/scripts/init-or-migrate.sh` | `STATUS=$?` read after `fi` → every failure reported as success, marker written anyway | all **4** status reads now `STATUS=0; cmd \|\| STATUS=$?` |
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

Both were **mutation-proven** — run against the unfixed code first, to show they fail. Measured
2026-10-04:

| Mutation | Result | What it shows |
|---|---|---|
| `init-or-migrate.test.sh` against the **original file** (both broken sites) | **7 passed, 3 failed** | the suite sees the defect |
| `init-or-migrate.test.sh` against a copy with **only the top site** reverted | **8 passed, 2 failed** | one reverted site is caught by one case |
| `init-or-migrate.test.sh` against the fixed file | **10 passed, 0 failed** | the fix holds |
| `compose-init-guard.test.sh` against the **pre-fix** block | **3 passed, 3 failed** | the suite sees the defect |
| `compose-init-guard.test.sh` against both fixed files | **6 passed, 0 failed** each | the fix holds |

**The second row is the one worth keeping.** Reverting only the top-level status read leaves the
migration path broken, and the suite still reports 8 green — so a test that exercised only the
first-run path would have called the bug fixed while the "subsequent run" path stayed wrong. That is
why the suite covers both paths. *(Caught by an independent critic re-measuring this table, which
originally quoted the 7/3 figure as though it belonged to a single-site mutation. It did not.)*

**How strong this proof is, stated plainly.** The tests exercise `mercato.run()` directly and the
compose block's real text; they do **not** run `yarn mercato init` end to end on this host, because
they cannot — the CLI's `assertNode24Runtime()` refuses anything below Node 24, and this machine has
only Node 22 (**N-11**). So the *status handling* is proven, and the *init itself* still has to be
seen failing and succeeding against a real database once the Docker engine is up (**B-04**). Do not
read "10 passed" as "the fresh-install path has been walked".

**The recorded fix was also re-scoped, deliberately.** It said to treat "a non-zero **or a printed
failure**" as failure. With the exit status now correct, matching on printed text is redundant — and
worse, the string `❌ Initialization failed:` also wraps the *"database already has users"* message,
which must be treated as **success**. A text match would have broken that recovery path. So the fix
is the status capture only, and the tests pin the already-seeded path as a success.

---

#### The real cause of the abort — found 2026-10-05, read off the database itself

The app log never contained the failing SQL, because the code that runs it catches the error and says
nothing. The Postgres server was asked instead (`log_min_error_statement` is already `error`), and it
had the statement:

```
ERROR:     column "organization_id" does not exist at character 8
STATEMENT: select "organization_id", "tenant_id" from "feature_toggles" where "id" = $1
```

One statement explains the whole failure.

**What is asking.** `packages/core/src/modules/query_index/di.ts`, in the CRUD→query-index
subscribers. When the event payload carries no org/tenant, the handler looks them up from the entity's
own table:

```ts
const row = await db
  .selectFrom(table as any)
  .select(['organization_id' as any, 'tenant_id' as any])
  .where('id' as any, '=', id)
  .executeTakeFirst()
```

**Why it fails here.** `feature_toggles` is a **global** table — deliberately. Its migration creates it
with no `organization_id` and no `tenant_id` (`Migration20251229215803.ts`) and no later migration adds
them; `featureToggleIdentifiers()` in the module returns `organizationId: null, tenantId: null` on
purpose. So the lookup asks a global table for scope columns it was never meant to have.

**Why that kills the command.** The lookup runs on the **same connection as the command's open
transaction** — measured, not assumed: both errors were logged on the *same backend PID* (`[29178]` in
one run, `[29381]` in the other). A failed statement aborts a Postgres transaction; the `catch {}`
swallows the *error* but cannot un-abort the *transaction*. The command then writes its audit row, and
that write is the next statement in the poisoned transaction:

```
ERROR:     current transaction is aborted, commands ignored until end of transaction block
STATEMENT: insert into "action_logs" (...) values (...)
```

**Why it looks intermittent — the first create always escapes.** Three runs were measured and the
result was identical each time: the **first** toggle created in a fresh process succeeds, the
**second** fails. The subscribers are registered asynchronously — the DI waits for the event bus, then
for a `custom_field_defs` query, before subscribing — so the first command finishes before they are
attached. Evidence, not theory: `action_logs` holds exactly **3** rows, for `feature_toggles_ui`,
`sales_channels_enabled` and `support_contact_settings` (the first create of each of the three runs),
while `feature_toggles` holds **5**. *(The race is the explanation that fits all three runs; the exact
interleaving was not instrumented.)*

**The fix, 2026-10-05 — and how the first attempt was caught being incomplete.** The lookup had been
**copy-pasted into five places**, and the copies even carried comments pointing at each other
(*"same pattern as vector_upsert.ts"*):

| Where | Copies |
|---|---|
| `packages/core/src/modules/query_index/di.ts` | 2 (CRUD upsert, CRUD delete) |
| `packages/search/src/modules/search/subscribers/fulltext_upsert.ts` | 1 |
| `packages/search/src/modules/search/subscribers/vector_upsert.ts` | 1 |
| `packages/search/src/modules/search/subscribers/vector_delete.ts` | 1 |

The **first** fix touched only the two in `query_index/di.ts`. It was rebuilt, re-verified as present
in the running container, and the reset **failed identically** — same statement, same abort. That is
how the other three were found: by trusting the result rather than the fix. The search subscribers are
registered at startup, so they were the ones actually firing.

The fix is now one exported `resolveRecordScope` in `packages/shared/src/lib/query/engine.ts` — it
asks the schema which scope columns exist (mirroring `BasicQueryEngine.columnExists`) and returns
nulls for a global table **without issuing a select at all**. All five call sites use it, so the
pattern cannot be reintroduced by copying a neighbour.

**Proven, not asserted:** a new test at
`packages/shared/src/lib/query/__tests__/resolve-record-scope.test.ts` was **mutation-proven** — run
against the old blind select it reports **2 failed, 3 passed**, and against the fix **5 passed, 0
failed**. The failing case asserts that *no* select is issued against a global table, which is exactly
the call the old code made. The existing `query_index` DI test was repaired to mock the resolver
rather than the removed helper, and still passes (its subject is the DI bridge, not the lookup).

**This is not a seeding-only bug.** Any CRUD command on a **global** table that emits CRUD side effects
— creating a feature toggle from the admin UI, for instance — reaches the same poisoned transaction.
The seed is just where it was noticed.

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

**ROOT CAUSE, TRACED 2026-10-05 — and it is TWO defects, not one.** The recorded text above is
`Invalid OpenAI API key`, which is **OpenAI's own error code** (it comes from the
`apiCode === 'invalid_api_key'` branch of `packages/search/src/vector/services/embedding.ts`).
llama.cpp does not emit that code. **So the request reached OpenAI, which means it never reached our
server at all.** Two independent causes:

1. **The `mcp` service was never given `OPENAI_BASE_URL`.** In `docker-compose.fullapp.yml` the
   variable is set for `opencode` (line 16) and `app` (line 204) and is **absent from the `mcp`
   service block** (lines 48–113), which has `OPENAI_API_KEY` at line 87. Confirmed by a second
   route: `@ai-sdk/openai`'s own dist reads `OPENAI_BASE_URL` as the default `baseURL`
   (`dist/index.js:8259`), so `EmbeddingService`'s `createOpenAI({ apiKey })` falls back to
   `https://api.openai.com/v1` — with key `local`. **The tool-search index runs in the MCP, which
   is the one container that was never told where the model is.** The fix is one line of YAML.
2. **The loaded model cannot embed.** Even with the base URL corrected, `Qwen2.5-7B-Instruct` is a
   chat model, and the `model` service command carries no `--embeddings`. This is the half the
   `llama/` analysis named, and it is real.

**And a second seam is missing.** `EmbeddingProviderId` is a **closed 6-value union**
(`openai | google | mistral | cohere | bedrock | ollama`) with per-provider hardcoded clients and
**no OpenAI-compatible member** — unlike the chat lane, which has 11 presets and a base-URL override.
So pointing embeddings at a local llama.cpp server needs **one new union member**, not just a URL.

**Severity, stated honestly.** Today the effect is a degraded tool search. But the *same lane* serves
the `pgvector` / `qdrant` / `chromadb` drivers the product's retrieval is built on, and the failure
mode is a **warning, not a gate** — so a silent embedding failure would be a degraded product, not a
degraded log line.

**Full design:** [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md)
§6.2 and §4.4.

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
  sh docker/scripts/__tests__/init-or-migrate.test.sh packages/create-app/template/docker/scripts/init-or-migrate.sh
  sh docker/scripts/__tests__/compose-init-guard.test.sh
  sh docker/scripts/__tests__/compose-init-guard.test.sh packages/create-app/template/docker-compose.fullapp.yml
  ```

  They must be run with **`sh`** and are safe to run at any time — no database, no containers, and
  they only write inside a scratch directory under `/tmp`. **`yarn test:docker-scripts` runs exactly
  these four**, and since 2026-10-05 a `docker-scripts` job in `.github/workflows/ci.yml` runs them on
  every push and PR — the job installs nothing, because they need no Docker, no database and no
  `node_modules`. **Note the four, not two:** `init-or-migrate.sh` exists in two copies
  (`docker/scripts/` and `packages/create-app/template/docker/scripts/`) and *both* are tested. Those
  runs catch **behaviour** drift only; byte-parity between the two copies is asserted separately, by
  `packages/create-app/src/lib/template-docker-scripts.test.ts`, which the existing unfiltered
  *Check create-app template parity* CI step already runs — see **N-14**.

---

## Resolved

| # | Was | Cleared by |
|---|---|---|
| 🟢 | **The object list was unknown** (30 / 33 / 34) — it blocked the Business Model Kernel specification | Decided 2026-10-04: start from the **union of 37**, prune in the spec *(the union was mis-stated as 36 until 2026-10-04 — corrected)* |
| 🟢 | **Two agent runtimes** (opencode + Hermes) — a "second copy" | Decided 2026-10-04: **Hermes takes the agent slot.** OpenCode is **not yet removed** — that is blocked on rewiring the platform chat (**B-05**, **N-8**) |
| 🟢 | **B-01** — Hermes used `network_mode: host` | Cleared 2026-10-04: Hermes's official Docker guide uses **bridge networking + a published port**; the `hermes` service is written that way |
| 🟢 | **B-02** — the admin password is typed by the owner | Cleared 2026-10-04 as a *blocker*: the arrow-(1) proof was taken from the container logs, the MCP's own tool list and the database, so no login was needed. The standing arrangement itself continues — see "Not blockers" above |
| 🟢 | **B-03** — no local model file | Cleared 2026-10-04: `Qwen2.5-7B-Instruct-Q4_K_M.gguf`, 4,683,074,240 bytes, `GGUF` magic verified |
| 🟢 | **B-04 (first occurrence)** — Docker Desktop's engine was not running | Cleared 2026-10-04: the owner started it and the engine reported Server **29.8.1**. **It recurred the same day** — `AutoStart` was off, so the engine was down again whenever the machine restarted. It is open again above, now with the finding that the agent cannot start it. **✅ CLOSED 2026-10-06: the owner turned auto-start on** (`NEEDS-YOU.md` item 6), so it no longer recurs |
| 🟢 | **B-04 (second occurrence)** — the engine was down again | **Cleared 2026-10-04, evening:** the owner started Docker Desktop and the full stack was verified running — **8 services up, 7 healthy, 21 AI tools discovered**, the app serving on `http://localhost:3000`, **loopback only**. Measured with `docker version` reporting a `Server:` block, not with `docker compose config`. **This recurred on every restart while `AutoStart` was off, and the agent cannot start it** (Docker Desktop's startup runs `wsl.exe`, blocked by this machine's Program Blacklist — not approvable, must not be worked around). **✅ CLOSED 2026-10-06:** the owner turned auto-start **on** ([`NEEDS-YOU.md`](NEEDS-YOU.md) item 6), measured with seven containers up and server **29.8.1**, so it no longer recurs. **What is still true: the agent cannot start Docker Desktop** — that half is a permanent security-policy block, not a setting |
| 🟢 | **B-15 half 1** — a failed database init was reported to its caller as success, so the "already seeded" marker was written and the app came up looking healthy on a half-seeded database | Fixed 2026-10-04. The recorded cause was **wrong** (the CLI does exit 1 — see the corrected diagnosis under **B-15**). The real cause was `STATUS=$?` read after `fi` in `init-or-migrate.sh`, where the status of an `if` with no `else` is always 0. The script read `$?` in **four** places and **two** were broken; all four now use one explicit shape, in **both** copies of the script. Half 2 (why the seeding transaction aborts at all) is still open |
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
| 🟢 | **B-15** — `mercato init` failed partway through, leaving a half-seeded database that reported itself healthy | **Cleared 2026-10-05, both halves.** *Half 1:* the failure was reported to its caller as success because `$?` was read after `fi`; all four status reads in **both** copies of `init-or-migrate.sh` now use one explicit shape. *Half 2:* it was never a seeding bug — a blind scope lookup on the global `feature_toggles` table aborted the surrounding transaction, and five copies of that lookup now share one `resolveRecordScope`. The 2026-10-05 reset then ran every init step green. **The full diagnosis is kept in place below, as the reference record.** |
| 🟢 | **B-18** — the app image could not be rebuilt, so no source fix written after 2026-10-04 03:08 had ever actually run | **Cleared 2026-10-05.** Two independent build blockers, both fallout from the approved removal of `apps/docs`. **(1)** `Dockerfile` copied `apps/docs/package.json` at two places (lines 17 and 87) — both removed. **(2)** `yarn.lock` still carried `"open-mercato-docs@workspace:apps/docs"`, so `yarn install --immutable` refused with `YN0028: The lockfile would have been modified by this install, which is explicitly forbidden`, killing the build at `builder 31/38` about 20 seconds in. Regenerated with Yarn 4.17.1 in a `node:24` container: **1,030 lockfile entries removed, 138 added** (31,041 → 20,952 lines). **(3)** The third casualty, found last and fixed this session: `.github/workflows/ci.yml` still built `apps/docs/Dockerfile` — that step is gone. **Re-measured 2026-10-05, five ways, because a fix that is not built is not a fix:** the image `open-mercato/app:local` is built **2026-10-05 06:29:28 +0200**, after every fix commit; both running app containers (`starting-kit-app-1`, `mercato-mcp-local`) report image **`sha256:2daca52e…`**, the same ID as the tag; `resolveRecordScope` is present in the **running container's** `packages/shared/dist/lib/query/engine.js`, `packages/search/dist/modules/search/subscribers/vector_upsert.js` and `packages/core/dist/modules/query_index/di.js`; the in-image `init-or-migrate.sh` hashes **`838969fe…`**, byte-identical to the repo copy; and the database's **last** error is `2026-10-05 04:13:01 UTC` — *before* the 04:30 reset, so there have been none since. |
