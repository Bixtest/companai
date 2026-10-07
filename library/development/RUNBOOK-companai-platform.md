# Runbook — the Companai platform deployment (`companai.corprorate.com`)

**Written:** 2026-10-07 · **Owner:** Ramzi · **Companion docs:**
[`vm-setup.md`](../../vm-setup.md) (the VM / domain / tunnel operating guide, written by the
VM-setup session) and [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md) (the Coolify host
itself). This page covers **only the Companai platform application** that runs on that host.

> **What changed on 2026-10-07, and why this page exists.** The platform is now reachable at
> **`https://companai.corprorate.com`** (it redirects to `/login`). It was **already deployed** before
> the domain work; what that session did was run the existing host helper
> `/opt/companai-platform/set-host.sh companai.corprorate.com` and publish the subdomain through the
> Cloudflare Tunnel. **No application code was deployed by that session.** This page records where the
> deployment lives, how it initialises, who its accounts are, and the one credential fault found and
> fixed on 2026-10-07.

---

## 1. What is deployed, and where

| Piece | Value |
|---|---|
| Public URL | `https://companai.corprorate.com` — expected root response is a **307 redirect to `/login`** |
| VM | `platform-server` (Ubuntu 24.04.5), reached at the **static** address `172.28.50.2` — see `vm-setup.md` |
| App container | **`companai-platform-app-1`** (image `open-mercato/app`) |
| Supporting containers | **`mercato-postgres-wan`**, **`mercato-redis-wan`**, **`mercato-meilisearch-wan`** — do **not** remove or recreate casually; the app depends on them |
| Deployment directory on the VM | **`/opt/companai-platform`** (holds `.env` and `set-host.sh`) |
| Source of the code | **this repository: `workspace/starting-kit`** (branch `main`) — the Starting Kit, a fork of Open Mercato 0.6.7 |
| Database | PostgreSQL, database **`open-mercato`** (inside `mercato-postgres-wan`) |
| Hostname helper | `/opt/companai-platform/set-host.sh` — rewrites hostname values and recreates the app container; **leaves the DB/Redis/Meilisearch volumes untouched** |

**Hostname change (safe procedure):** back up the env first, then run the helper, then update the
Cloudflare Tunnel route and Traefik label to match.

```bash
cd /opt/companai-platform
cp -a .env ".env.before-host-change.$(date -u +%Y%m%dT%H%M%SZ)"
./set-host.sh new-subdomain.corprorate.com
curl -H 'Host: companai.corprorate.com' -I http://127.0.0.1/     # expect 307
docker logs --tail 100 companai-platform-app-1
```

---

## 2. How the app initialises (this is what makes deploys behave the way they do)

The app container runs an init/migrate step on start, gated by an **init marker volume** so it only runs
**once**:

```
INIT_COMMAND='yarn mercato init'  →  docker/scripts/init-or-migrate.sh
```

- The marker is `mercato-init-marker-${DEPLOY_ENV}`. **Init re-runs only if the marker is gone** (a fresh
  volume) — the script says so explicitly, and refuses to start the app if init fails rather than serve a
  half-initialised database.
- `mercato init` creates the tenant, the organisation, the roles (`superadmin`/`admin`/`employee`) and the
  initial users. The **primary user's password** is `OM_INIT_SUPERADMIN_PASSWORD` (or `--password=`), and
  its email is `OM_INIT_SUPERADMIN_EMAIL` — see `packages/cli/src/mercato.ts` lines 1108–1112.
- **Re-running init on an EXISTING user does NOT reset that user's password** (`setupInitialTenant` reuses
  the row and only reconciles roles). So a redeploy alone cannot change or restore a password.

**Current init environment on the deployed container (values redacted):**
`OM_INIT_SUPERADMIN_EMAIL=admin@companai.local` · `OM_INIT_SUPERADMIN_PASSWORD` set (32 chars) ·
`SELF_SERVICE_ONBOARDING_ENABLED=true` · `DEMO_MODE=true` · `NODE_ENV=development`.

---

## 3. The platform's accounts (measured 2026-10-07, from the database)

Tenant data encryption is **on**, so the `users.email` column holds ciphertext; the readable key is
`users.email_hash` (a keyed lookup hash). The mapping below was reached by **two independent routes** —
the role query, and computing the lookup hash for each candidate email and matching it to the row.

| Email | Role | `is_super_admin` | Confirmed |
|---|---|---|---|
| **`admin@companai.local`** | **superadmin** | **true** | yes |
| `admin@acme.com` | admin | false | yes |
| `employee@acme.com` | employee | false | yes |

All three were created in the single init run of **2026-10-05 05:50:20 UTC**.

---

## 4. The superadmin credential fault — found and FIXED 2026-10-07

**Symptom (reported by the owner):** he could log in as **admin** but not as **superadmin**, and
suspected a deploy had changed the credentials.

**What was measured:**

1. The superadmin account exists: `admin@companai.local`, role `superadmin`, `is_super_admin = true`,
   confirmed, with a password hash set (not null).
2. A real login against the live endpoint with **the deploy's own `OM_INIT_SUPERADMIN_PASSWORD`**
   returned **HTTP 401** — so the stored password was **not** the env value. (A correct login returns 200;
   the endpoint deliberately returns an identical 401 for wrong-password and unknown-email, so the 401
   alone does not say which — but the reset below proves the account and the email lookup were fine.)
3. **Not a code defect.** `mercato init` does use `OM_INIT_SUPERADMIN_PASSWORD` for the primary user
   (`mercato.ts:1109`), and `setupInitialTenant` does not rewrite an existing user's password. So the
   stored value simply **differed from the env value at some point** — most plausibly the env value was
   rotated after the 2026-10-05 init, or the password was changed through the UI. The exact cause could
   not be recovered (bcrypt is one-way).

**The fix (applied 2026-10-07):** the superadmin's `password_hash` was reset to a fresh, strong value,
targeting **only** the superadmin row (`id 1638a2de-5161-4c8a-a656-7f677e04dcf0`). The admin and employee
accounts were **not touched**, so the owner's existing admin login still works.

- **Verified:** `UPDATE 1`, then a real login at `https://companai.corprorate.com/api/auth/login` with the
  new password returned **HTTP 200** (it was 401 before). Re-verified 2026-10-07: the stored credential
  returns **200**, and the same email with a deliberately wrong password returns **401** (so the 200 is
  the account, not a blanket success).
- **The login body must be FORM-encoded, not JSON.** `POST /api/auth/login` reads
  `application/x-www-form-urlencoded` (or multipart) fields `email` / `password` — see
  `packages/core/src/modules/auth/api/login.ts` (`parseLoginForm`). A JSON body returns **HTTP 400**
  regardless of the credential, which looks like a fault but is not. Working check:
  `curl -s -o /dev/null -w "%{http_code}" -X POST https://companai.corprorate.com/api/auth/login
  -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "email=…" --data-urlencode "password=…"`.
- **Credential recorded in** `vms/CREDENTIALS.local.txt` (the gitignored file — see
  `RUNBOOK-platform-server.md` §3), **not** in chat or in the repo.
- **Undo:** re-run the reset with a different password (the same script).

**The reset script (kept, gitignored):** `vms/_reset-superadmin.sh`. It generates a password locally,
hashes it with the app's own `bcryptjs` at cost 10, ships only the SQL to the VM, applies it, verifies the
login, and records the credential. It changes **only** the one row's `password_hash` + `is_confirmed`.

**To change it again later:** either re-run that script, or change it in the platform UI while logged in
as the superadmin.

---

## 5. What is NOT done / open questions for the owner

- **The env value `OM_INIT_SUPERADMIN_PASSWORD` no longer matches the live password.** Since init only
  runs once, that env value is now **stale** for this deployment. It should either be updated to the new
  password (so a future fresh-volume rebuild seeds a known value) or left and treated as unset. **Owner's
  call** — recorded, not decided here.
- **No production SMTP** is configured; signup is enabled with auto-confirmation (same limitation the
  `vm-setup.md` records for the neighbouring Konsult app). Password-reset email flows therefore do not
  work — the reset above was done out-of-band for exactly that reason.
- **Deploying a new version of the platform** is not yet documented end-to-end (build image → ship →
  migrate). That is the next piece, pending the owner's discussion.

---

## 6. Quick diagnostics

```bash
# on the VM
docker ps --filter name=companai
docker logs --tail 100 companai-platform-app-1
curl -H 'Host: companai.corprorate.com' -I http://127.0.0.1/          # expect 307 -> /login
# from the laptop
curl.exe -sS -I https://companai.corprorate.com/
```
