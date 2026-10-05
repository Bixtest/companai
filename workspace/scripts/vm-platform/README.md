# The platform VM's scripts — the version-controlled copy

**Why this folder exists.** The scripts that build and run the platform on the VM were written straight
into a folder that git ignores (`vms/`, excluded by `.gitignore` line 99 — it also holds the VM's
credentials and a 4 GB ISO, so it must stay ignored). That meant the deployment logic lived **only on
this laptop and on the VM**. If either disk died, it was gone, and the runbooks describe *what* the
scripts do but not the code itself.

These are copies of those scripts, now tracked. **No secrets are in this folder** — the scripts
*generate* secrets with `openssl` and read them from `.env`, which is not here and must never be added.

## What is here

| File | What it does | Also lives at |
|---|---|---|
| `make-env.sh` | generates `.env` for the WAN deployment; refuses to overwrite an existing one | `/opt/companai-platform/` on the VM |
| `deploy.sh` | starts postgres, redis, meilisearch, waits for health, then the app | same |
| `set-host.sh` | points the platform at a different hostname — one command | same |
| `verify.sh` | prints the raw evidence that the platform is really serving | same |
| `docker-compose.wan.yml` | **the only original config** — adds the `coolify` network and the Traefik labels | same |
| `new-site.sh` | creates a "site in a directory" under `/opt/sites/` | `/opt/sites/` on the VM |
| `check-in-step.sh` | proves this folder and the laptop's working copies still match | — |

## What is deliberately NOT here

Two files in the same working folder are **copies of the kit's own files**, already tracked in the
`starting-kit` repository, so copying them here would create a second source of truth for the same bytes:

| File | Where the canonical copy is | Verified |
|---|---|---|
| `docker-compose.fullapp.yml` | `workspace/starting-kit/docker-compose.fullapp.yml` | identical — sha256 `e391ba6d958dee5eafc3076226a2a2e29a66b0f5eb7661c699fee89daa50b26c` |
| `docker/redis/redis.conf` | `workspace/starting-kit/docker/redis/redis.conf` | identical — sha256 `55c716e2c71dc23adc65a295b18912e86f6221de8d93fc02b48a120ae0df5524` |

And one file must never be tracked, here or anywhere:

| File | Why |
|---|---|
| `.env` | it holds the generated database password, JWT secret, tenant encryption keys and the first superadmin password. Mode 600, on the VM only. |

## How to use it

**The tracked copy is the master.** If you change a script, change it here first, then push it to the VM:

```bash
scp -i vms/id_ed25519 workspace/scripts/vm-platform/<file> \
    ramzi@172.28.50.2:/opt/companai-platform/
```

If instead the working copy on the laptop was edited (that is where they were written), copy it back
here and commit:

```bash
cp vms/platform/<file> workspace/scripts/vm-platform/<file>
git add workspace/scripts/vm-platform/<file>
```

**Then prove the two are the same** — this is the point of `check-in-step.sh`:

```bash
sh workspace/scripts/vm-platform/check-in-step.sh
```

It compares every file and exits non-zero if any has diverged, so drift is a thing you notice rather
than a thing you discover later.

## Where the scripts are documented

| Document | Covers |
|---|---|
| [`RUNBOOK-platform-server.md`](../../../library/development/RUNBOOK-platform-server.md) | the VM itself, how it was built, rollback, rebuild from scratch |
| [`RUNBOOK-deploying-a-site.md`](../../../library/development/RUNBOOK-deploying-a-site.md) | the proxy, the deployment proof, and what is and is not proven |
| [`RUNBOOK-adding-a-domain-step-by-step.md`](../../../library/development/RUNBOOK-adding-a-domain-step-by-step.md) | GoDaddy → Cloudflare → tunnel → SSL, and the three site types |
| [`RUNBOOK-hosting-server-manual.md`](../../../library/development/RUNBOOK-hosting-server-manual.md) | operating the server: domains, directories, databases, phpMyAdmin |
