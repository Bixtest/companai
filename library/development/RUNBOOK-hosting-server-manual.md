# Runbook — the hosting server: connecting to it, and doing domain / site / database work on it

**This is the entry point for anyone — a person or an AI agent — who needs to operate the hosting
server.** It is written to be used *while working*, so it carries the literal commands, the literal
button names, and the things that go wrong.

Written 2026-10-05. Everything in it was measured against the running machine on that date. Where
something is not proven, it says so.

Companions, for depth rather than for the basics:

| Document | What it holds |
|---|---|
| [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md) | the machine itself — how it was built, rollback, the rebuild-from-scratch route |
| [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md) | the longer treatment of the proxy, the proof stack, and what is and is not proven |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | why this stack exists and what it is for |

---

## 0. How to use this with an AI agent

If you are pointing an AI agent at this document, give it this file and these four rules, which are the
ones that keep it out of trouble here:

1. **Prove it, do not assume it.** Every claim about the server should come with the command and its
   output. Several entries below exist precisely because an assumption was wrong.
2. **The VM is reachable from this laptop only.** Not from other machines on the network, and not from a
   cloud-hosted agent. Anything the agent runs must run from here, or from inside the VM. Deploying
   happens here; *visiting* a finished site happens through a tunnel (§12).
3. **Disk is the binding constraint** — 6.4 GB free at the time of writing. Nothing gets installed or
   pulled without checking `df -h /` first.
4. **Never install Plesk, CasaOS or Nginx Proxy Manager.** They fight Coolify for ports 80/443. This is
   a standing decision, not a preference (canonical architecture §15).
5. **The agent cannot log into the Coolify dashboard** — 2FA blocks it. Either the owner does those
   clicks, or the owner issues a Coolify **API token** and the agent drives the API (§2).

---

## 1. The server at a glance

| Piece | Value |
|---|---|
| Hyper-V VM | `Platform-Server` — Generation 2, **2 vCPU**, dynamic memory 3–6 GB |
| Guest OS | Ubuntu **24.04.5 LTS**, kernel 6.8.0-146, hostname `platform-server` |
| RAM | 5.8 GiB total, **~3.9 GiB available** |
| Disk | dynamic VHDX, 24 GB max — **23 GB filesystem, 15 GB used, 6.4 GB free (70%)** |
| NIC 1 — `eth0` | `Default Switch`, **DHCP** — `172.19.122.65`. **Changes across reboots. Never hard-code it.** |
| NIC 2 — `eth1` | `AI-Private`, **static `172.28.50.2/24`, no gateway** — the stable host↔VM link |
| Docker | **29.8.2**, Compose **v5.6.0** |
| Coolify | **4.3.23**, dashboard on **port 8000** |
| Traefik | **v3.6.25**, container `coolify-proxy`, on ports **80 / 443** |
| Files on the laptop | `C:\Users\Ramzi\Downloads\companai\vms\` — **gitignored** |

**What is listening on the VM** (measured with `ss -ltn`):

| Port | Bound to | What |
|---|---|---|
| 22 | all interfaces | SSH |
| 80, 443 | all interfaces | Traefik — the proxy every site goes through |
| 8000 | all interfaces | Coolify dashboard |
| 3000 | **127.0.0.1 only** | the Companai platform app (reached through Traefik, not directly) |

**There is no DNS server on this VM, and no mail server.** See §4 — this is the single biggest
difference from Plesk, and the thing people assume wrongly.

### The VM is not on your network

All three Hyper-V switches (`Default Switch`, `WSL`, `AI-Private`) are **Internal** type with no physical
adapter. So the VM can reach the internet, and this laptop can reach the VM, but **no other machine on
your network can reach it.** Confirmed from two independent host captures.

If you ever need a colleague on the same LAN to open a site directly, that is a deliberate change to the
switch type — not a Coolify setting. In practice you do not need it: §12 gets a site onto the public
internet without touching the network at all.

---

## 2. How to connect

### The one hard rule: this address exists only on this laptop

`172.28.50.2` sits on a Hyper-V **Internal** switch. It is not a public address, it is not on your
office network, and **it does not exist anywhere except on this laptop.** So:

- **You can reach the VM from this laptop.** Always.
- **An AI agent running on this laptop can reach it too** — same address, same key, same commands.
- **An AI agent running anywhere else cannot reach it at all** — not a cloud agent, not a web chat, not
  another machine on the network. Not with a different address, not with a password. There is no route.
- **Deploying happens from the laptop. Visiting happens through a tunnel** (§12). Two different paths,
  and it is worth keeping them apart: it is fine that the VM is private, because nothing outside needs
  to reach it directly — only the finished sites do.

### SSH (the way you will work)

From the laptop, in Git Bash:

```bash
cd "C:/Users/Ramzi/Downloads/companai/vms"
ssh -i ./id_ed25519 ramzi@172.28.50.2
```

The key means **no password is needed to log in**. Use the static `172.28.50.2`; the DHCP address moves.

To run one command without opening a session:

```bash
ssh -i ./id_ed25519 ramzi@172.28.50.2 'docker ps'
```

**Root commands.** `ramzi` is in the `docker` group, so Docker needs no elevation. For anything else,
`sudo` needs the VM password — which is in `vms/CREDENTIALS.local.txt`. The form that works (a heredoc
does **not** reach `sudo -S`):

```bash
PW=$(sed -nE 's/^VM_PASSWORD[[:space:]]*=[[:space:]]*//p' CREDENTIALS.local.txt | head -1)
printf '%s\n' "$PW" | ssh -i ./id_ed25519 ramzi@172.28.50.2 "sudo -S -p '' <command>"
```

> Note the spaces around `=` in that file. A regex written for `VM_PASSWORD=…` silently matches nothing.

### For a separate AI agent: what it can do, and the one wall it will hit

**Everything except the Coolify dashboard.** Over SSH an agent can read and write files, run docker and
compose, add Traefik labels, start and stop stacks, read logs, run the cloudflared tunnel, and verify
its own work with `curl`.

**The wall is the dashboard.** Coolify has **2FA on**, so no agent can sign in through the UI — it would
need the 6-digit code from your phone. An agent therefore **cannot** click *Add resource* or type into a
*Domains* field. Two ways past it; pick one:

1. **You do the dashboard clicks.** The agent prepares everything else and tells you exactly which
   fields to fill and what to type. This is how the current deployment was done, and it works.
2. **You create a Coolify API token and the agent drives Coolify's API directly** — this removes the
   wall entirely. Verified to exist in the running Coolify 4.3.23 (`routes/web.php` line 398,
   `/security/api-tokens`):

   - open **`http://172.28.50.2:8000/security/api-tokens`** in the laptop's browser (you will be asked
     for your 2FA code);
   - give the token a name — the field's placeholder reads `CI deployment token`;
   - tick the permissions it needs: **`read`**, **`write`**, **`deploy`**;
   - click **Create** and **copy the token straight away** — it is shown once and never again;
   - hand it to the agent, and it can create projects, resources and domains itself;
   - **revoke** it on the same page when the work is finished.

### A brief you can paste to the agent

> You are operating a hosting server. It is an Ubuntu 24.04 VM reachable **only from this laptop**, at
> the static address `172.28.50.2`. SSH with the key at `C:/Users/Ramzi/Downloads/companai/vms/id_ed25519`
> as user `ramzi` — no password needed. `ramzi` is in the `docker` group, so Docker needs no `sudo`.
> The server runs Coolify 4.3.23 (dashboard on port 8000) with Traefik v3.6.25 on ports 80/443; every
> site is routed by Traefik matching the `Host:` header. Read
> `library/development/RUNBOOK-hosting-server-manual.md` before doing anything, and follow its rules:
> prove every change with a `curl`, check `df -h /` before pulling images (only ~6 GB free), never
> install Plesk/CasaOS/Nginx Proxy Manager, and always pass `--noproxy '*'` when curling a local address
> from the laptop. You cannot log into the Coolify dashboard (2FA) — if you need it, ask for an API
> token.

### The Coolify dashboard (the Plesk-like control panel)

Open **`http://172.28.50.2:8000`** in the laptop's browser and sign in as `admin`. **2FA is on**, so you
need the 6-digit code from the authenticator app.

- Registration is **closed**, so nobody else can create an account.
- **The admin password is still the originally exposed one and must be changed** — Coolify → click
  `admin` bottom-left → **Profile** → **Password**. Full steps: `RUNBOOK-platform-server.md` §6a Task 2.
  Until that is done, 2FA is the only thing protecting the panel.

### Starting and stopping the VM

From the laptop, no elevation needed:

```powershell
Start-VM  -Name "Platform-Server"
Stop-VM   -Name "Platform-Server"            # graceful
Stop-VM   -Name "Platform-Server" -TurnOff   # hard, only if hung
```

It **auto-starts** with the laptop (30 s delay) and auto-stops gracefully with it.

### If you cannot reach it

```bash
# is the VM up, and what address does it have now?
# (PowerShell, on the laptop)
(Get-VMNetworkAdapter -VMName "Platform-Server" | Where-Object Name -eq "Network Adapter").IPAddresses

# is Coolify's dashboard answering?  expect 302
curl --noproxy '*' -s -o /dev/null -w '%{http_code}\n' http://172.28.50.2:8000/

# is the proxy answering?  expect 404 when nothing is routed
curl --noproxy '*' -s -o /dev/null -w '%{http_code}\n' http://172.28.50.2/
```

> **Always pass `--noproxy '*'` when probing a local address on this laptop.** The laptop has
> `http_proxy` set, so a plain `curl` to a local address goes through the proxy and you end up measuring
> the proxy, not the server — it has returned a `502`, and once a `200` whose body was
> "upstream connect failed". This has cost real time here.

---

## 3. Architecture, and what replaced Plesk

### The layers

```
browser / the internet
        │
        ▼
   Cloudflare  ──────────────►  (optional) a tunnel, when the VM has no public address
        │
        ▼
  Traefik  :80 / :443        container `coolify-proxy` — routes by the Host header
        │
        ├──► coolify network (10.0.1.0/24)  ── every Coolify-deployed site
        └──► mercato-network-wan            ── the Companai platform stack
        │
        ▼
   your containers
```

Everything that serves a web page goes through **Traefik**. Traefik decides which container gets a
request by looking at the **`Host:` header** and matching it against labels on the container. Coolify
writes those labels for you when you type a domain into a resource's **Domains** field.

One consequence worth knowing: a container is **invisible to Traefik until it carries
`traefik.enable=true`**, because Traefik runs with `--providers.docker.exposedbydefault=false`.

### Coolify is the Plesk replacement

Coolify is the management interface for exactly the things Plesk did. From the canonical architecture
(§15), Coolify manages:

```text
domains · applications · Docker images · Docker Compose · databases · environment variables
storage · deployments · logs · metrics · resource limits · proxy · TLS · WordPress · AI services
```

**Do not install Plesk** (or CasaOS, or Nginx Proxy Manager) alongside it — they all want ports 80/443.

### What is running right now

| Container | What | Notes |
|---|---|---|
| `coolify`, `coolify-db`, `coolify-redis`, `coolify-realtime`, `coolify-proxy`, `coolify-sentinel` | Coolify itself | leave alone; all healthy |
| `companai-platform-app-1` | the Companai platform | see §11 |
| `mercato-postgres-wan`, `mercato-redis-wan`, `mercato-meilisearch-wan` | its database, cache and search | no published ports |
| `teststack-*` (4, stopped) | a throwaway proof stack | stopped, not deleted — §13 |

Two docker networks carry traffic: **`coolify`** (Traefik's own) and **`mercato-network-wan`** (the
platform's). A container must be on `coolify` to be routed by Traefik.

---

## 4. DNS — read this before you plan anything

**There is no DNS server on this VM.** Nothing is listening on port 53. Plesk shipped one; this stack
deliberately does not, because DNS belongs where the domain's nameservers already point.

So "adding a domain" is really **two separate jobs**, and only one of them is on this server:

| Job | Where it happens | Who does it |
|---|---|---|
| 1. Make the name **resolve** to this server | at your domain registrar, or Cloudflare's DNS | you (the owner) |
| 2. Tell the proxy **which container** answers that name | Coolify → the resource → **Domains** | you or the agent |

Nothing on the server can do job 1. If a name does not resolve, no amount of Coolify configuration will
make it work — and that is the most common reason "it doesn't work yet".

### The problem to solve first: this VM has no public address

The VM is behind your laptop, behind NAT, on Internal switches. Public DNS has to point at something the
internet can reach. Two ways:

- **Port forwarding on your router** — needs a static public IP or dynamic DNS, and exposes the machine
  directly. **Not recommended.**
- **Cloudflare Tunnel** — the VM dials *out* to Cloudflare, so **nothing is opened inbound and no router
  change is needed**. This is the chosen route. It needs a domain whose DNS is on Cloudflare, plus a
  tunnel token. **See §12** — this is already proven to work here.

### Adding DNS records

For a real domain, in the Cloudflare dashboard for that domain → **DNS**:

| Type | Name | Content | When |
|---|---|---|---|
| `CNAME` | `app` (for `app.example.com`) | `<tunnel-id>.cfargotunnel.com` | when using a named Cloudflare Tunnel — the normal case |
| `A` | `app` | the public IP | only if you have a real public IP and forwarded ports |

If you use a named tunnel, Cloudflare can create the record for you from the tunnel's **Public Hostname**
tab — that is the safer path, because it wires the record to the tunnel in one step.

### Testing locally, with no domain at all

For local testing, point names at the VM **from this laptop only**, using the Windows hosts file. Run
once, **as Administrator**:

```powershell
cd "C:\Users\Ramzi\Downloads\companai\vms"
.\phase10-test-domains.ps1
```

That adds and verifies `wp.test`, `pma.test`, `app.test`, `whoami.test`. To add more, edit the `$Names`
list at the top of that script and re-run — it only adds what is missing, so it is safe to repeat.

**Undo:** `.\phase10-test-domains-rollback.ps1` (also as Administrator). It removes only the lines it
added, identified by a marker comment, and never touches your own entries.

> Use `.test` — it is the reserved TLD for exactly this. Do not use `.local`; Windows reserves it for
> Bonjour and it misbehaves.

---

## 5. Adding a domain or subdomain

### The short version

1. Make the name resolve (§4).
2. Coolify → **Projects** → your project → the resource → **Domains**.
3. Type the domain and click **Save domain**.
4. Redeploy, or let Coolify redeploy on save.
5. Open the name in a browser.

### The Domains field — the actual rules

Coolify's own helper text on the field says:

> Add one domain per entry. Press Enter (or type a comma) to add it. You can specify a path and a port to
> bind the domain to.

Read from the running source (`bootstrap/helpers/docker.php`, `fqdnLabelsForTraefik`), each entry is
parsed as `scheme://host[:port][/path]`:

| You type | What Coolify does |
|---|---|
| `https://app.example.com` | routes on **https**, with `tls=true` and `tls.certresolver=letsencrypt` → **a real certificate is requested** |
| `http://app.test` | routes on **http**, **no certificate, no Let's Encrypt** |
| `http://app.test/files` | same, but the route is limited to the `/files` path — `PathPrefix('/files')` |
| `http://app.test:3000` | routes to port **3000 inside the container** |

**Two consequences that catch people out:**

- **For `.test` names, always write `http://`.** Let's Encrypt cannot validate a name that does not exist
  publicly, so `https://` on a `.test` name tries and fails to get a certificate.
- **Always include the scheme.** The parser reads the scheme to find the host. The helper's own examples
  all carry one, and a bare `app.test` is not worth the risk.

Coolify warns you if two resources claim the same domain, because only one can win.

### Multiple names on one resource

Add one entry per name — `https://app.example.com`, `https://www.example.com` — each on its own line.
They all point at the same container.

---

## 6. Domain directories — "code in a directory"

**The path is how you do this.** `http://site.example.com/files` claims only that directory, so a second
resource can own a different path under the same domain while the first keeps the rest.

Example — WordPress at the root, something else under `/docs`:

| Resource | Domains field | Result |
|---|---|---|
| WordPress | `https://site.example.com` | owns the whole host |
| Docs site | `https://site.example.com/docs` | owns only `/docs` |

**Proven here** on 2026-10-04: with `Host: wp.test` and the path `/files/hello.txt`, the request was
served by a *different* container (nginx) than the one answering the root. You do not need to touch
Traefik by hand.

---

## 7. SSL / TLS

There are two different things people mean by "SSL here", and they are handled in different places.

**Case 1 — the site is reached through a Cloudflare Tunnel (the normal case).**

Cloudflare terminates TLS at its edge, so the browser sees a valid, publicly trusted certificate, and
nothing at the origin needs one. **Do nothing.** This is proven working (see §12).

**Case 2 — the site is addressed directly at the origin.**

Then Traefik gets the certificate, using Let's Encrypt. This needs two things to be true:

- the name **resolves publicly** (so Let's Encrypt can reach it), and
- ports **80 or 443** are reachable from the internet.

Write the domain with **`https://`** — that is what adds `tls.certresolver=letsencrypt`. Then:

- Set **`ACME_EMAIL`** to a real address you monitor. Let's Encrypt emails you before a certificate
  expires or if issuance starts failing.
- Certificates renew automatically. **Do not** set up a cron job for it.
- A failed issuance is usually one of: the name does not resolve, port 80 is blocked, or Cloudflare's
  proxy is on with a conflicting mode. Check Coolify's proxy logs first.

**What is not proven:** Let's Encrypt issuance at the origin has **never been exercised here**, because
this VM has no publicly resolvable name and no reachable port 80. It is standard Traefik behaviour, but
treat it as untested until you see a real certificate.

> **A trap if you later put Cloudflare in front of a directly-addressed site:** Cloudflare's proxy plus
> Let's Encrypt's HTTP challenge can deadlock unless the SSL mode is set correctly. With a tunnel (§12)
> the problem does not arise at all.

---

## 8. Databases and phpMyAdmin

### Creating a database

Project → **Add resource** → **Databases**. Coolify 4.3.23 offers:

**PostgreSQL · MySQL · MariaDB · Redis · KeyDB · Dragonfly · MongoDB · ClickHouse**

Or let a service bring its own — the WordPress one-click service includes MariaDB, which is usually what
you want for a WordPress site.

### Linking a database to a site

The database's credentials appear as environment variables on its page, and Coolify shows an **internal
hostname** for it. Point the site's config at that hostname. Because both containers sit on the same
docker network (`coolify`), the site reaches the database **by name** — no IP addresses, and nothing
published to the outside.

**Proven 2026-10-04:** a second database was created beside the first, a table was written into it, and
a separate container reached it **by name** and read the row back.

### phpMyAdmin

Coolify ships a one-click phpMyAdmin service: project → **Add resource** → **Services** → search
`phpmyadmin`. Give it a domain such as `http://pma.test`.

The template sets **`PMA_ARBITRARY=1`**, so the login screen accepts **any host you type** — one
phpMyAdmin can administer every database on the machine, not just one.

To log in, open the site and fill in:

| Field | What to put |
|---|---|
| **Server** (the arbitrary-host box) | the database's internal hostname from its Coolify page |
| **Username** | the database user |
| **Password** | the database password |

**Proven 2026-10-04:** a full HTTP login with `Host: pma.test`; the title came back
`pma.test / mariadb | phpMyAdmin 5.2.3`, `Server: mariadb:3306`, both databases listed, live session.

> phpMyAdmin over a **public** address is a real risk. If you expose it, put it behind a long random
> path, or better, reach it through the tunnel only while you need it and remove it after.

---

## 9. WordPress

Deploy it through Coolify's template (canonical architecture §16): project → **Add resource** →
**Services** → search `wordpress` → pick the entry that includes MariaDB. Coolify creates the WordPress
container **and** its database together and wires them up.

Then set its **Domains** field (`http://wp.test` for local testing, `https://wp.example.com` in public).

**Proven 2026-10-04:** `Host: wp.test` returned `302 → /wp-admin/install.php`, and that path returned
`200` with `<title>WordPress › Installation</title>` — the installer.

### The other kind of WordPress you asked about

You also described wanting **directory-based hosting**: add the domain, create a directory, upload your
own backup into it, import the database through phpMyAdmin, then test. That is a *different* thing from
WordPress-as-a-container, and it is **not what this stack does by default**. If you want it, say so —
it is a small piece of work (a static/nginx resource with a mounted directory, plus a database), but it
should be built deliberately rather than assumed.

---

## 10. Deploying another Docker platform

This is the pattern the Companai platform uses, and it works for any stack. Coolify can also do it from
Git or a registry — use Coolify's own path if the image is pullable, and this pattern if it is not.

1. **Get the image onto the VM.** If it is not in a registry, transfer it:

   ```bash
   docker save <image>:<tag> | ssh -i ./id_ed25519 ramzi@172.28.50.2 'docker load'
   ```

   **Check `df -h /` first.** The VM has 6.4 GB free; a large image will not fit.

2. **Make a directory** under `/opt/<name>` and put your compose file and `.env` there.

3. **Add the `coolify` network and Traefik labels** so the proxy can find it:

   ```yaml
   services:
     app:
       networks:
         - your-network
         - coolify          # REPEAT the base file's networks — see the warning below
       labels:
         - "traefik.enable=true"
         - "traefik.docker.network=coolify"
         - "traefik.http.routers.mysite.entrypoints=http"
         - "traefik.http.routers.mysite.rule=Host(`mysite.example.com`)"
         - "traefik.http.services.mysite.loadbalancer.server.port=3000"
   networks:
     coolify:
       external: true
   ```

   > **Compose *replaces* a service's `networks` list, it does not merge it.** Listing only `coolify`
   > drops the service off its own bridge and it can no longer resolve its database by name. Repeat the
   > base file's networks.

   > **`docker compose config` prints every secret in plaintext.** Do not run it against a live `.env`
   > and dump the output.

4. **Start it:**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --no-build
   ```

5. **Prove it**, do not assume it: `curl` the container's published port from inside the VM, then
   `curl -H 'Host: mysite.example.com' http://127.0.0.1/` to prove Traefik routes it, then fetch the
   real URL from the laptop.

**A working example of exactly this** is `/opt/companai-platform` on the VM — see §11.

---

## 11. The Companai platform, already deployed

It runs as a plain compose stack beside Coolify (Coolify cannot deploy an image that exists only on
disk, and with 2FA on nobody can click through its UI).

| Item | Value |
|---|---|
| Where | `/opt/companai-platform` on the VM |
| Files | `docker-compose.fullapp.yml` (the kit's own, verbatim), `docker-compose.wan.yml` (the only difference), `.env` (mode 600) |
| Scripts | `make-env.sh`, `deploy.sh`, `set-host.sh`, `verify.sh` |
| Running | `app`, `postgres`, `redis`, `meilisearch` |
| Not running | `opencode`, `mcp`, `model`, `hermes`, `localstack` — see §11a |

```bash
cd /opt/companai-platform
./deploy.sh                 # start (or re-start); safe to re-run
./set-host.sh <hostname>    # point it at a different name — one command
./verify.sh [public-url]    # print the evidence that it is really serving
grep OM_INIT_SUPERADMIN .env   # the first admin login
```

The full detail — including the one thing that does not work properly (the app cannot see visitor IP
addresses) — is in [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md) §10.

### 11a. What the five unused services are

You asked about these directly. Here is what each one is and what it means for us.

| Service | What it actually is | Do we need it? |
|---|---|---|
| **`opencode`** | The agent runtime that the **platform's own AI Assistant chat is built on**. `packages/ai-assistant/.../api/chat/route.ts` imports `createOpenCodeClient`, and the handlers call `OPENCODE_URL`. It is not a stray file — it is load-bearing. | **Yes, right now.** It cannot simply be deleted: deleting it breaks the platform's built-in chat. Removing it properly is backlog item **N-8** — rewire the chat to the app's own LLM registry first, *then* delete the service and the `OPENCODE_*` variables. It is tracked as blocker **B-05**. |
| **`mcp`** | **MCP = Model Context Protocol** — the standard way an AI agent calls tools. This service (`mcp:serve-http`, port 3001) takes the platform's **own tool registry** and exposes it over MCP, with RBAC and feature checks, so an agent can actually *act* in the platform rather than just chat about it. It provisions an API key into a shared volume so the agent can authenticate. | **Yes, when the AI assistant matters.** Without it the assistant can talk but not do. It reuses the app image, so it costs nothing to build — only RAM. |
| **`hermes`** | A separate agent runtime (`nousresearch/hermes-agent`), the **chosen agent slot** per decision A1, running as `gateway run` on port 8642. It needs a model served with **at least 64K context**. | **Not yet — by your instruction.** You will hand me the Hermes work next, and it will live inside the main docker later. Left out for now. |
| **`model`** | A local **llama.cpp** server (OpenAI-compatible, port 8080) serving a GGUF file from `./models`. This is what the local AI runs on, and what Hermes talks to. | **Not on this VM.** It needs a multi-gigabyte GGUF file that is not here, and the VM has 6.4 GB of disk. Fine on the laptop. |
| **`localstack`** | A **local emulator for AWS**. Here it is configured with `SERVICES: s3`, i.e. a fake S3 bucket, so the platform's S3 storage provider can be tested without an AWS account. It sits behind the `storage-s3` profile, so it only starts if you ask for it. | **No — not in production.** It is a development stand-in. A real deployment points at real S3 or another storage provider. |

**In one line each:** `opencode` is the chat's engine (needed, and removable only after N-8); `mcp` is
how an agent calls the platform's tools (needed for AI to act); `hermes` is the agent we chose, coming
later; `model` is the local AI brain (laptop only, too big for this VM); `localstack` is a fake S3 for
testing (never needed in production).

---

## 12. Getting a site onto the public internet with no domain of your own

`cloudflared` is installed on the VM (**2026.9.3**). A **quick tunnel** needs **no account and no
token** and gives you a free public `https://<random-words>.trycloudflare.com` address:

```bash
setsid nohup cloudflared tunnel --no-autoupdate --url http://localhost:80 \
  > /tmp/cf-site.log 2>&1 < /dev/null &
sleep 10
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-site.log | head -1
```

Then point the site's Domains field at that hostname and it is live on the internet.

**Proven end-to-end 2026-10-05** — this is not theory. Fetched from the laptop:

- `200`, 484,571 bytes, 0.40 s, `CF-Ray: …-ARN`, `Server: cloudflare`, `<title>Companai</title>`;
- the public body and the VM's own `127.0.0.1:3000` body were **byte-identical** under a unique
  cache-buster (484,658 bytes, `sha256 e257ec25…`), with `CF-Cache-Status: DYNAMIC` — so it really was
  this container, not an edge cache.

**Two things to know:**

- **The address changes on every restart.** After any restart, re-point the site at the new hostname.
- For a **permanent** address on your own domain, use a **named tunnel** with a token — that is your
  domain work, and §4 explains the DNS side.

---

## 13. Operating safely — the "don't ruin the laptop" rules

**Disk is the constraint, not CPU.** 6.4 GB free. Before anything large:

```bash
df -h /              # the guest disk
docker system df     # what Docker is using
docker image prune   # remove unused images (safe)
```

The stopped `teststack-*` containers hold ~1.9 GB of images. They are kept deliberately — their proof is
recorded — but they can be removed if space gets tight.

**Do not:**
- install Plesk, CasaOS or Nginx Proxy Manager — they fight Coolify for 80/443;
- use `router port forwarding` to expose the VM — the tunnel exists so you do not have to;
- delete `/data/coolify/` or the `coolify-*` containers;
- run `docker compose down -v` anywhere unless you mean to delete that stack's data;
- enable Hyper-V checkpoints — they silently double disk use (they are off, and should stay off).

**Do:**
- check `df -h /` before pulling images;
- prove each change with a `curl` before moving on;
- keep the 3.8 GB installer ISO — it is the only rebuild route (there is 69 GB free on C:, measured
  2026-10-05).

---

## 14. Troubleshooting

| Symptom | Most likely cause | What to do |
|---|---|---|
| A name does not resolve at all | DNS is not set — and DNS is **not** on this server (§4) | check the record at the registrar / Cloudflare |
| Name resolves, but you get Traefik's `404` | no container claims that hostname | check the resource's **Domains** field; Traefik routes by the `Host:` header |
| `502` / `503` from Traefik | the container is down, or on the wrong network | `docker ps`; the container must be on the **`coolify`** network |
| The site works on `.test` but not on the real domain | the Domains field still says the old name | update it, redeploy |
| `https://` on a `.test` name fails | Let's Encrypt cannot validate a non-public name | use `http://` for `.test` |
| Certificate never issues | name not public, port 80 blocked, or Cloudflare mode conflict | §7 |
| A container is invisible to the proxy | missing `traefik.enable=true` — Traefik runs `exposedbydefault=false` | add the label |
| Service cannot reach its database by name | it got dropped off its own network by a compose override | repeat the base networks in the override (§10) |
| `curl` to a local address returns nonsense | the laptop's `http_proxy` | add `--noproxy '*'` |
| Everything is slow / containers dying | RAM or disk | `free -h`, `df -h /` |

**Collecting evidence** (paste these when asking for help):

```bash
docker ps -a
df -h / ; free -h
docker logs --tail 100 <container>
```

---

## 15. Ground rules

1. **Plesk is not installed and will not be.** Coolify is the control panel (§3).
2. **DNS lives at the registrar, not here** (§4). Two jobs, two places.
3. **Every site goes through Traefik**, which routes by the `Host:` header.
4. **The VM is reachable from this laptop only** (§1). For outside testers, use a tunnel (§12).
5. **Prove, do not assume** (§0). Every claim in this document has a command behind it.
6. **Disk first** (§13). 6.4 GB is not much.
