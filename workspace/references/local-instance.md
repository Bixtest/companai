# Running the platform locally

**Why this exists.** Four commits passed the full gate — install, typecheck,
lint, test, build — and the platform still could not start (**L14**). A green
build proves the code agrees with itself. Only running it proves the code agrees
with the database, the seed files and the environment.

**Rule: boot the platform after every few removals, not at the end of Phase S.**

Everything runs on the laptop. No cloud, no deployment.

---

## What you need once

| Piece | How it runs | Required? |
|---|---|---|
| PostgreSQL 17 + pgvector | Docker (`docker-compose.yml`) | **yes** |
| Redis | Docker | no — queue defaults to `local`, cache to `sqlite` |
| Meilisearch | Docker | no — `/api/search/index` returns 503 without it |
| Node 24.19.0 | `workspace/.toolchain/node24/` (project-local) | **yes — see below** |
| Yarn 4.17.1 | `corepack yarn` — never bare `yarn` | **yes** |

Docker Desktop must actually be running, not merely installed. `docker info`
fails with a named-pipe error when the engine is down.

### Environment variables must be declared in `turbo.json` or they vanish

Turbo runs every task in a **filtered environment**. A variable that is not in
`globalEnv`, `globalPassThroughEnv`, or the task's own `env` never reaches the
process — silently, with no warning.

```bash
OM_LOG_LEVEL=debug corepack yarn start    # looks like it works; produces no debug output
```

`OM_LOG_LEVEL` and `OM_AUTHORITY_SHADOW` are now declared in
`globalPassThroughEnv`. **Anything new goes there too**, or the next person will
spend an hour concluding their feature is broken when their flag simply never
arrived.

Verify with: `grep -c '"level":20' <log>` after a request — zero debug lines
while `OM_LOG_LEVEL=debug` means the variable did not arrive.

### Node 24 is not optional, and the machine's default is Node 22

`package.json` declares `"node": "24.x"`. The system-wide `node` on this machine
is **22.21**, so **every shell must put the project-local Node 24 on PATH first**:

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

PowerShell:

```powershell
$env:PATH = "C:\Users\Ramzi\Downloads\companai\workspace\.toolchain\node24;$env:PATH"
```

**Check it before anything else — `node --version` must print v24.**

What goes wrong without it:

| Command | On Node 22 |
|---|---|
| `corepack yarn start` | refuses: *"Unsupported Node.js runtime… requires Node 24.x"* |
| `corepack yarn test` | **appears to pass**, but two `ai-assistant` suites silently fail to load — `isolated-vm` ships `abi137` (Node 24) and `abi147`, never `abi127` (Node 22) |

The second one is the dangerous one: the gate reports green while 109 tests never
ran. It cost a false upstream-issue report (U6, withdrawn). On Node 24 the full
gate is **22/22 tasks, 12,290 tests**.

---

## First run

```bash
docker compose up -d postgres redis
```

`apps/mercato/.env` is gitignored and starts as a copy of `.env.example`, whose
secrets are literal `change-me-*` placeholders. **Replace them** — `JWT_SECRET`,
`AUTH_SECRET`, `NEXTAUTH_SECRET`, `TENANT_DATA_ENCRYPTION_FALLBACK_KEY`. It costs
nothing and keeps a placeholder secret from ever reaching a deployed environment.

The defaults that matter are already correct: `DATABASE_URL` points at
`localhost:5432`, `OM_ENABLE_ENTERPRISE_MODULES=false`, `DEMO_MODE=true`.

```bash
corepack yarn db:migrate
```

Then create the first tenant and admin. **Note the `--`** — without it Turbo
consumes the flags and fails before anything runs:

```bash
corepack yarn initialize -- --email=admin@local.test --password='<a real password>'
```

Without `--password` the CLI defaults to `secret`. It also creates
`employee@local.test` with password `secret` regardless — fine locally, never
beyond.

```bash
corepack yarn dev:classic
```

`dev:classic` rather than `dev`: the default runtime is an interactive TUI that
does not behave in a captured shell. Ready in about 30 seconds at
<http://localhost:3000>; individual pages compile on first visit, which can take
30–60 seconds each.

## Re-running after code changes

**The running app serves compiled output, not your source.** Editing a file
under `packages/` changes nothing that a browser can see until you build — and if
the instance was started with `yarn start`, not even then, until you restart it.

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
corepack yarn build:packages     # packages/*/dist — what the app imports
corepack yarn build:app          # .mercato/next — what `yarn start` serves
```

Then restart the server:

```bash
netstat -ano | grep ":3000.*LISTENING"    # find the pid
taskkill //PID <pid> //T //F
corepack yarn start
```

**Turbo will cache `build:app` even when `packages/*/dist` changed** — if it
reports `FULL TURBO` in 2 seconds, it did not rebuild. Force it:

```bash
corepack yarn build:app --force
```

Verify the code actually landed before asking anyone to test:

```bash
grep -c writeDirectWriteAuditLog packages/core/dist/modules/<module>/api/<route>.js
```

**Why this has its own section.** R2c passed every test, typechecked, and
committed — and the change was invisible in the browser, because the server had
been serving an 18-hour-old build the whole time. `tsc`, `jest` and every grep
guard read *source*; none of them touch what the process executes. See
[L20](../../LESSONS.md).

`yarn dev` hot-reloads app code, but still needs `build:packages` for anything
under `packages/`.

## Starting from a clean database

The honest test after a removal — a resumed partial init hides ordering bugs.

```bash
docker exec mercato-postgres psql -U postgres -d open-mercato -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Then `db:migrate` and `initialize` again.

---

## The smoke test

Login is form-encoded, **not JSON** — posting JSON returns 400:

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "email=admin@local.test" --data-urlencode "password=<password>"
```

The response body carries a JWT. Use it as `Authorization: Bearer <token>` for
API routes, or as a `Cookie: auth_token=<token>` header for backend pages.

**Enumerate routes; never guess them.** Guessed URLs produce 404s that read like
regressions (**L2**):

- API paths — `apps/mercato/.mercato/generated/openapi.generated.json`
- Backend pages — `apps/mercato/.mercato/generated/backend-routes.generated.ts`

A module's name is **not** in its page URL. `auth/backend/roles/page.tsx` serves
`/backend/roles`, not `/backend/auth/roles`. Only a module's root page uses the
module name.

Two traps when sweeping many URLs:

- **Strip carriage returns.** A path list written by Python on Windows carries
  `\r`, and every request dies with `curl: (3) URL rejected`. All-identical
  results mean the harness is broken, not the platform (**L3**).
- **Read the status distribution, not individual codes.** 400 usually means a
  required query parameter is missing. **5xx is the signal that matters.**

## "Failed to fetch" on the login page

**Almost certainly not a failure.** In dev mode Turbopack compiles each route the
first time it is requested. The login POST hits `/api/[...slug]`, the catch-all
serving all 428 API routes, so a cold compile takes **90–120 seconds** — longer
than the browser will wait. The message is the browser giving up, not the server
erroring.

Check the dev log before investigating anything:

```
POST /api/auth/login 200 in 112s (next.js: 70s, application-code: 43s)
```

A `200` there means it worked. **Retry the login and it returns in under half a
second.** Same for the first visit to any backend page (30–60s each).

**What triggers a fresh cold compile:** any change under `packages/` — including
running `build:packages` — invalidates the dev server's compiled output. So a
rebuild is always followed by one very slow first request per route.

**To avoid it entirely**, run a production build, which compiles everything up
front and serves instantly:

```bash
corepack yarn build && corepack yarn start
```

Use dev mode for changing code, the production build for demonstrating or
click-testing the platform.

## Known non-defects

Confirmed against `upstream-baseline` — do not re-investigate:

| Symptom | Cause |
|---|---|
| `/api/customers/interactions/{counts,conflicts}` → 500 | Upstream bug: `entityId` must be a UUID and validation failure returns 500 instead of 400. Both files are byte-identical to baseline. |
| `/api/search/index` → 503 | Meilisearch not started. |
| `WARN Emitting undeclared event` | Upstream: `customers` and `catalog` emit events absent from their `events.ts`. |
| `WARN sales.examples missing catalog match` | Upstream demo-data mismatch between the `sales` and `catalog` seeds. |
| `WARN Using derived tenant encryption keys` | No Vault or DEK locally. **Production needs a real key** — do not carry this forward. |
| `custom-domain warm-up skipped` | `INTERNAL_APP_ORIGIN` / `DOMAIN_RESOLVE_SECRET` unset. |

Every one lives in a module scheduled for removal, except the encryption-key
warning, which is a real production requirement.

## Baseline result — 2026-08-08

Recorded after the `packages/enterprise` removal, so later runs have something to
compare against.

| Check | Result |
|---|---|
| Migrations | 263 tables, no `record_locks` / `sso_*` / `security_*`, `domain_mappings` intact |
| Initialisation | Clean, 210 entities indexed |
| Backend pages | **67 / 67 → 200**, ~1.2 MB of rendered HTML, no error boundaries |
| API endpoints | 195 parameterless GETs: 164 × 200, 20 × 400 (missing params), 6 × 404, 2 × 500, 1 × 503, 1 × 422, 1 × 308 |
| Attributable to our changes | **One** — the missing workflow seed file (**L14**) |
