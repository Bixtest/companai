# Deploying the platform to a VPS

**Who this is for.** Somebody who has never seen this codebase and needs it
running on a domain or subdomain, on a VPS, ideally managed through Plesk.

**Read this first — the honesty note.** Every command, path, version and
environment variable below is taken from the repository or from the working local
instance, and the build/migrate/start sequence is the one used daily. **The
Plesk-specific steps have not been executed end to end on a Plesk server.** They
are the standard way to run a long-lived Node service behind Plesk, written by
somebody who knows the shape of the problem — treat them as a well-informed
first run, not as a transcript. Where a step is a judgement call rather than a
fact from the repo, it says so.

Related: [`local-instance.md`](local-instance.md) for running it on a laptop, and
[`../knowledge/module-lifecycle.md`](../knowledge/module-lifecycle.md) for what
migrations do.

---

## 1. What you are actually deploying

Four things, and only the first is obvious:

| Piece | What it is | Required? |
|---|---|---|
| **The web app** | A Next.js server. Serves the back office at `/backend` and the storefront/portal at `/` | Yes |
| **PostgreSQL 17** | All state. Needs the `pgvector` and `pgcrypto` extensions | Yes |
| **Background workers** | Queue consumers — emails, indexing, bulk operations, the authority hold-window sweep | Yes in practice; see §8 |
| **Redis** | Cache, queue and rate-limit backend | Only for more than one app instance — but see §6 |

The app **does not** serve its own TLS or bind port 80. It listens on a port
(default 3000) and something in front terminates TLS and proxies to it. On Plesk
that something is nginx.

## 2. Server prerequisites

| | Version | Notes |
|---|---|---|
| **Node.js** | **24.x** | Hard requirement — `engines: { node: "24.x" }`. Node 22 will fail in ways that look unrelated |
| **Yarn** | **4.17.1** | Via corepack: `corepack enable && corepack prepare yarn@4.17.1 --activate`. Never bare `yarn` |
| **PostgreSQL** | **17** | With `pgvector`. The local instance uses `pgvector/pgvector:pg17-trixie` |
| **Redis** | 7.x | Optional for a single instance, required for more than one |
| **RAM** | **4 GB minimum, 8 GB comfortable** | The build sets `--max-old-space-size=8192`. A 2 GB box will OOM during `next build` |
| **Disk** | 10 GB + database | `node_modules` alone is multiple GB |

**Build on the server or build elsewhere?** Building needs the RAM above. If the
VPS is small, build on a bigger machine or in CI and ship the artefacts — but the
`.mercato/generated` registry is produced by `yarn generate` against the enabled
module list, so it must be generated with the same module configuration it will
run with. Simplest correct answer: build on the server.

## 3. Plesk: create the site

1. **Domains → Add Domain** (or **Add Subdomain**), e.g. `app.example.com`.
2. Note the document root Plesk creates, typically
   `/var/www/vhosts/example.com/app.example.com`.
3. **Do not** use Plesk's *Node.js* extension for this app. It runs Passenger,
   which wants to own the process and expects a single entry file; this app is
   started by its own CLI (`mercato server start`), which supervises Next plus
   optional worker processes. Passenger fighting that supervisor is a bad time.
   *(Judgement call, not a repo fact.)* Run it as a systemd service instead — §7 —
   and let Plesk do what it is good at: TLS and nginx.

## 4. PostgreSQL

Create the database and user (Plesk: **Databases → Add Database**, or on the
command line):

```sql
CREATE DATABASE "open-mercato";
CREATE USER mercato WITH PASSWORD 'use-a-real-password';
GRANT ALL PRIVILEGES ON DATABASE "open-mercato" TO mercato;
```

Then, **connected to that database**, install the two extensions. This needs
superuser and is the step most likely to be forgotten:

```sql
\c "open-mercato"
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER SCHEMA public OWNER TO mercato;
```

If your provider's Postgres has no `pgvector`, install `postgresql-17-pgvector`
(Debian/Ubuntu) or disable vector search with
`OM_DISABLE_VECTOR_SEARCH_AUTOINDEXING=true`. **Do not skip `pgcrypto`.**

**Connection budget.** Each process gets its own pool (`DB_POOL_MAX`, default 20),
and the web app and each worker are separate processes. Keep
`web + workers + overhead ≤ max_connections`. On a default Postgres
(`max_connections = 100`), one web app and one worker at 20 each is fine; four
workers plus a web app at defaults is not.

## 5. Get the code onto the server

```bash
cd /var/www/vhosts/example.com
git clone <your-fork-url> app.example.com-src
cd app.example.com-src/workspace/starting-kit
corepack enable && corepack prepare yarn@4.17.1 --activate
corepack yarn install --immutable
```

Keep the source **outside** the document root, or beside it — Plesk's document
root is public, and this repository contains `.env` once you create it.

## 6. Environment

Copy the example and edit it. `apps/mercato/.env` is the file the app reads:

```bash
cd apps/mercato
cp .env.example .env
```

**The minimum that must be set:**

```bash
DATABASE_URL=postgres://mercato:use-a-real-password@127.0.0.1:5432/open-mercato
APP_URL=https://app.example.com

# Generate each of these separately: openssl rand -base64 48
JWT_SECRET=...
AUTH_SECRET=...
NEXTAUTH_SECRET=...

PORT=3000
NODE_ENV=production
DEMO_MODE=false
```

**`.env.example` ships `change-me-*` placeholders for the secrets. Replacing them
is not optional** — they are the signing keys for every session token.

**Strategies, and the warning you will see.** The app starts with:

```
CACHE_STRATEGY=sqlite  QUEUE_STRATEGY=local  RATE_LIMIT_STRATEGY=memory
```

and prints a warning that these are single-instance. That is **correct for one
app process** and the warning is informational. For more than one instance they
are actively wrong — duplicate jobs, stale ACLs, weakened rate limits — so switch
to the multi-instance-safe values and point them at Redis:

```bash
REDIS_URL=redis://127.0.0.1:6379
CACHE_STRATEGY=redis
QUEUE_STRATEGY=async
RATE_LIMIT_STRATEGY=redis
RATE_LIMIT_ENABLED=true
```

Set `OM_MULTI_INSTANCE=1` to turn that warning into a hard startup failure — worth
doing the day you add a second instance, so nobody quietly scales out on
single-instance strategies.

**Email.** `NOTIFICATIONS_EMAIL_FROM`, `EMAIL_FROM`, `ADMIN_EMAIL`. Password
resets and invitations go nowhere without a working mail path.

## 7. Build, migrate, start

**Order matters, and the reason is worth knowing:** the app serves compiled output
from `packages/*/dist`, and the generated module registry is produced from the
enabled module list. Building in the wrong order gives you a running server with
last week's code and no error to explain it.

```bash
cd /var/www/vhosts/example.com/app.example.com-src/workspace/starting-kit

corepack yarn build:packages   # compile the packages
corepack yarn generate         # build the module registry from those packages
corepack yarn build:packages   # again -- generation can change what packages export
corepack yarn build:app --force  # compile the Next app against the registry
```

**`--force` is not optional.** Turbo caches `build:app`, and its hash does not
always pick up a change to `packages/*/dist` — so a plain `build:app` can report
success and redeploy the previous bundle. A deploy that silently ships the last
release is the worst kind, because everything looks fine ([[L38]]).

`corepack yarn build` runs exactly that sequence if you prefer one command.

**Then the database.** Migrations are safe to run from more than one process —
`db:migrate` takes a Postgres advisory lock, so a second run waits rather than
racing (`knowledge/module-lifecycle.md` → *Two boots migrating at once*):

```bash
corepack yarn db:migrate
```

**Then the first tenant.** Interactive:

```bash
corepack yarn mercato init
```

Or scriptable, which is what you want for a repeatable deploy:

```bash
corepack yarn mercato auth setup \
  --orgName "Acme" \
  --email admin@example.com \
  --password "$ADMIN_PASSWORD" \
  --orgSlug acme \
  --json
```

Full usage: `mercato auth setup --orgName <name> --email <email> --password
<password> [--orgSlug <slug>] [--roles superadmin,admin,employee]
[--skip-password-policy] [--include-demo-users] [--with-examples] [--json]`.

**Pass the password through a variable, never a literal** — a literal lands in
shell history and in the process list. Read it from a prompt or a root-owned
file, and unset it afterwards.

It prints one JSON line with the tenant, organization and admin user ids. Add
`--with-examples` only if you want demo data. `--orgSlug` must be lowercase
letters, digits and dashes, 1–63 characters, not starting or ending with one.

**Then run it.** `/etc/systemd/system/mercato.service`:

```ini
[Unit]
Description=Open Mercato
After=network.target postgresql.service

[Service]
Type=simple
User=<the plesk system user for this domain>
WorkingDirectory=/var/www/vhosts/example.com/app.example.com-src/workspace/starting-kit/apps/mercato
Environment=NODE_ENV=production
ExecStart=/usr/bin/corepack yarn start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mercato
sudo systemctl status mercato
```

`yarn start` runs `mercato server start`, which starts Next on `PORT` and — unless
you turn it off — supervises the workers and scheduler too.

## 8. Workers and the scheduler

By default the server spawns them itself:

```bash
AUTO_SPAWN_WORKERS=true
AUTO_SPAWN_SCHEDULER=true
```

That is fine for one box. **`.env.example` says to set them false and run workers
separately in production**, which matters because a worker crash-looping inside
the web process takes the site with it, and because workers and web have very
different memory profiles.

To split them, set both to `false` and add a second systemd unit running
`corepack yarn mercato queue worker --all`. Keep the connection budget in §4 in
mind: that is another pool.

**Something must run the scheduler.** The authority hold-window sweep (gate `A3` —
"commit unless vetoed") runs on it. Without a scheduler those acts wait for a
human indefinitely; setup logs a warning saying so, and nothing else will tell you.

## 9. nginx, the domain and TLS

In Plesk: **Domains → app.example.com → Apache & nginx Settings**, and under
*Additional nginx directives*:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
}
```

Tick **Proxy mode** off for Apache if Plesk offers it — you want nginx talking
straight to Node, not nginx → Apache → Node.

The `Upgrade`/`Connection` headers are not optional: the platform pushes live
updates over SSE (the DOM Event Bridge), and without them notifications and
progress bars silently never arrive.

**TLS:** Plesk → **SSL/TLS Certificates → Let's Encrypt**, then force HTTPS
redirect. Make sure `APP_URL` matches the final HTTPS URL exactly — links in
emails are built from it.

## 10. Check it actually works

```bash
# The app answers, and the guard redirects an unauthenticated request
curl -s -o /dev/null -w '%{http_code}\n' https://app.example.com/backend      # 307

# A route that does not exist answers differently -- this is the control that
# makes the 307 above mean something
curl -s -o /dev/null -w '%{http_code}\n' https://app.example.com/backend/nope # 404

# Text direction is decided (see knowledge/i18n-and-direction.md)
curl -s -H 'Accept-Language: ar' https://app.example.com/login | grep -oE '<html[^>]*>'
```

Then sign in at `https://app.example.com/backend` with the admin created in §7,
and confirm **Settings → Authority → Approvals** loads.

`journalctl -u mercato -f` is where startup errors go — and it is worth watching
on the first boot after any deploy, because dependency-injection failures surface
**only** at startup. A build can be entirely green and the service still refuse to
start ([[L37]]).

## 11. Redeploying a change

```bash
git pull
corepack yarn install --immutable
corepack yarn build:packages && corepack yarn generate && corepack yarn build:packages && corepack yarn build:app --force
corepack yarn db:migrate
sudo systemctl restart mercato
```

**Back up the database before any deploy that carries a migration.**
`workspace/scripts/checkpoint.sh <label>` does this locally; on a server use
`pg_dump` and verify the dump is readable (`gzip -t`) before trusting it — we have
had two truncated backups that looked fine.

## 12. Operating it

Everything here uses capabilities the platform already has. It is the difference
between *deployed* and *operable*, and none of it needs new code.

### Back it up

The database holds everything: records, the journal, and the hash chain that
proves the journal has not been altered. Losing it loses the ability to answer
what happened, which is the product.

```bash
# nightly, as the app user — keep 30 days
pg_dump -Fc "$DATABASE_URL" > /var/backups/companai/$(date +%F).dump
find /var/backups/companai -name '*.dump' -mtime +30 -delete
```

Add it to `cron` or a systemd timer. **Then restore one**, onto a scratch
database, before you rely on it — a backup nobody has restored is a belief, not
a backup.

Also back up **`.env`**. It holds the keys that decrypt tenant data; a database
restored without them is ciphertext.

### Watch it

| Signal | Where | Why it matters |
|---|---|---|
| App responds | `GET /login` returns 200 | The cheapest liveness check that exercises rendering |
| Workers alive | `mercato queue worker --all` process present | Silent failure here stalls email and indexing with no error surface |
| Scheduler alive | `mercato scheduler start` process present | Same, for anything time-based |
| Postgres connections | `pg_stat_activity` count vs `max_connections` | Web + worker pools are additive; exhaustion starves the request path (see `packages/shared/AGENTS.md`) |
| Disk | `/var/lib/postgresql`, attachments dir | The ledger only grows |
| Error rate | app logs, `OM_LOG_LEVEL=info` | Structured JSON; ship to whatever you already run |

There is a **System Status** page in the admin under Settings that reports which
strategies are active (cache, queue, rate limit) and flags single-instance-only
choices. Read it once after deploying.

### Rotate the encryption key

This exists and is scriptable:

```bash
corepack yarn mercato auth rotate-encryption-key --tenant <tenantId>
```

Prefer `--tenant`. Rotating across all tenants with one old key is possible and
the command warns about it, because a single old key normally belongs to one
tenant.

Rotate on the ordinary triggers: somebody with access leaves, a key is exposed,
or on a schedule your policy sets. **Take a backup first** — rotation rewrites
encrypted columns.

### Attachments, if you run more than one instance

Two app instances on one filesystem will not share locally-stored attachments.
The S3 module handles it and ships disabled:

```bash
OM_ENABLE_STORAGE_S3=true
OM_INTEGRATION_STORAGE_S3_BUCKET=…
OM_INTEGRATION_STORAGE_S3_REGION=…
OM_INTEGRATION_STORAGE_S3_ACCESS_KEY_ID=…
OM_INTEGRATION_STORAGE_S3_SECRET_ACCESS_KEY=…
```

Also switch the single-instance strategies named in §6 — cache and queue to
Redis, rate limit to Redis — or two instances will disagree about ACLs and run
the same scheduled job twice.

### Restarting

`systemctl restart` drops in-flight connections. For a single instance that is a
few seconds at a quiet hour. Anything better is blue/green and is genuinely a
separate piece of work — see §13.

## 13. What this guide does not cover

Stated rather than left to be discovered:

- **Nothing here has been run on a real Plesk server.** See the note at the top.
- **No zero-downtime deploy.** `systemctl restart` drops connections. Blue/green
  or a second instance behind nginx is a separate piece of work.
- **No horizontal scaling recipe.** §12 covers shared attachment storage and the
  strategies to switch; it does not cover session affinity or a load balancer.
- **No *automated* backup verification.** §12 gives the schedule and the restore
  step; nothing checks that a restore still works. That check is worth writing
  before this holds real data.
- **No CDN or asset offload.** Next serves its own static assets through the proxy.
- **`@react-email` is unmaintained** (27 deprecation notices). Not a
  vulnerability, and the one real advisory is fixed — see
  [U18](upstream-issues.md). Replacing the email rendering stack is its own work.
- **Secrets live in a plain `.env` file.** No vault. A rotation *procedure* now
  exists (§12) but nothing enforces a schedule.
- **Custom per-tenant domains** (`PLATFORM_PRIMARY_HOST`, `CUSTOM_DOMAIN_*`,
  `ACME_EMAIL`) exist in the env surface but the `domain_mappings` extraction is
  deferred — sprint item 22. Treat those variables as not yet supported.

Each of these is a real gap, and none of them stops a single-instance deployment
on one VPS from working.
