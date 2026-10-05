# Runbook — adding a domain you own at GoDaddy, all the way to a live site with SSL

**This is the practical, ordered version.** Follow it top to bottom. It answers one question: *I own a
domain at GoDaddy — what exactly do I click and type to get a site on the VM answering at that name,
over HTTPS?*

Written 2026-10-05. Every step is marked with how it was established:

| Mark | Meaning |
|---|---|
| **PROVEN** | done on this VM, with the command output recorded in this document |
| **DOCUMENTED** | taken from GoDaddy's or Cloudflare's own help pages, **not yet run here** |
| **OWNER** | a step only you can do, because it needs your login or your phone |

**The short answer to "is this documented?"** — it is now. Before this document it was spread across
eight sections of the manual, and two pieces were missing entirely: the **GoDaddy half**, and
**hosting your own codebase in a directory**. The second one did not exist on the VM at all; it was
built and proven today (Part 8).

---

## Part 0 — The one decision, made once

You own `yourdomain.com` at GoDaddy. A site lives on the VM. **Something has to connect the two**, and
there are only two ways. Pick once, then everything after follows.

| | **Route A — Cloudflare Tunnel** | **Route B — Port forward** |
|---|---|---|
| Who dials whom | the VM dials *out* to Cloudflare | the internet dials *in* to your router |
| Router change needed | **none** | yes — a port forward you set up yourself |
| Exposes your laptop | **no** | **yes, directly** |
| Survives your IP changing | **yes** | no — home broadband IPs move |
| Cost | free | free |
| Nameservers | must move to Cloudflare | stay at GoDaddy |
| Status | **PROVEN working on this VM** | **not set up; not recommended** |

**Take Route A.** Route B is only listed so the choice is visible. The VM has no reachable inbound port
(measured from three independent outside hosts, §4 of the manual), so Route B would mean opening your
laptop to the internet first.

**There is no third option.** A DNS record cannot point at `172.28.50.2` — that address exists inside
your laptop and nowhere else.

---

## Part 1 — One-time: point a GoDaddy domain at Cloudflare  *(DOCUMENTED / OWNER)*

You do this **once per domain**. It is the step that feels like work and then never again.

> **Before you start — check your email.** If `yourdomain.com` has email on it (MX records, Microsoft
> 365, Google Workspace), note those records first. Cloudflare scans and imports most records when you
> add the domain, but a missed MX record means your email stops. GoDaddy's own help page says plainly:
> *"Changing your nameservers may break existing connections to your website or email."*

### 1a. Add the domain to Cloudflare

1. Sign in at `dash.cloudflare.com` (free account).
2. Select **Add a site**.
3. Type `yourdomain.com` and select **Continue**.
4. Choose the **Free** plan.
5. Cloudflare scans the domain's existing records and shows them. **Check the list** — especially any
   `MX` records for email. Select **Continue**.
6. Cloudflare now shows **two nameservers**, looking like `dana.ns.cloudflare.com` and
   `rob.ns.cloudflare.com`. **Write both down exactly.** They are specific to your account.
7. It says "Complete your activation" — leave this tab open.

### 1b. Tell GoDaddy to use those nameservers

From GoDaddy's own help page (*Change my domain nameservers*):

1. Sign in to your GoDaddy **Domain Portfolio** (`dcc.godaddy.com/control/portfolio`).
2. **Select the individual domain** — this opens its **Domain Settings** page.
3. Select **DNS**, then select **Nameservers**.
4. Choose **I'll use my own nameservers**.
   *(The other option, "GoDaddy Nameservers (recommended)", keeps DNS at GoDaddy — that is Route B.)*
5. Type **both** Cloudflare nameservers from step 1a.
6. Select **Save**, then **Continue**.
7. If the domain has **Domain Protection**, GoDaddy asks for identity verification — an SMS or
   authenticator code. This is normal.
8. GoDaddy warns that the change can take **up to 48 hours** to spread worldwide. In practice it is
   usually well under an hour.

### 1c. Wait, then confirm

Back in the Cloudflare tab, the domain goes from *Pending* to **Active**, and Cloudflare emails you.

Confirm from the laptop — this asks the public DNS system directly, which is the only honest test:

```bash
nslookup -type=NS yourdomain.com 8.8.8.8
```

**What you should see:** the two `*.ns.cloudflare.com` nameservers. If you still see GoDaddy
nameservers, it has not propagated yet — wait, do not move on.

Repeat Part 1 for each domain you own. All of them fit in one free Cloudflare account.

---

## Part 2 — One-time: create the permanent tunnel on the VM  *(DOCUMENTED)*

Part 1 made Cloudflare the phone book. This part gives Cloudflare a way to reach the VM. The tunnel is
**one** for the whole machine — every domain and every name you add later rides on it.

### 2a. Create it in the dashboard

1. Cloudflare dashboard → **Networking** → **Tunnels**.
2. Select **Create a tunnel**.
3. Choose **Cloudflared**, select **Next**.
4. Name it, e.g. `companai-vm`. Select **Save tunnel**.
5. Cloudflare shows an install command containing a long token starting with `eyJ...`.
   **Copy that token.** Treat it as a password — it lets anyone run a tunnel on your account.

### 2b. Run it on the VM

`cloudflared` is already installed on the VM (**version 2026.9.3**, measured).

```bash
cd "C:/Users/Ramzi/Downloads/companai/vms"
PW=$(sed -nE 's/^VM_PASSWORD[[:space:]]*=[[:space:]]*//p' CREDENTIALS.local.txt | head -1)
printf '%s\n' "$PW" | ssh -i ./id_ed25519 ramzi@172.28.50.2 \
  "sudo -S -p '' cloudflared service install <PASTE-THE-TOKEN-HERE>"
```

That installs it as a service, so it comes back after a reboot. Confirm:

```bash
ssh -i ./id_ed25519 ramzi@172.28.50.2 \
  'sudo systemctl status cloudflared --no-pager | head -12'
```

In the Cloudflare dashboard the tunnel should read **Healthy**.

> **The target is always `http://localhost:80`** — that is Traefik, and Traefik is what decides which
> site answers. You never point a tunnel at an individual container.

### 2c. Where you will add names

For every name you want, add a route here: tunnel → **Routes** → **Add route** → **Published
application**.

| Field | What to put |
|---|---|
| **Subdomain** | `shop`, or `app`, or leave **empty** for the bare domain |
| **Domain** | pick from the drop-down — only domains already active in Cloudflare appear |
| **Path** | leave empty (or a path, if you want one site to own a directory) |
| **Service URL** | `http://localhost:80` — always |

Select **Add route**. Cloudflare creates the DNS record for you, which is why this is safer than typing
records by hand.

---

## Part 3 — Add a subdomain site: `shop.yourdomain.com`

This is the everyday case. Four steps, two places.

### Step 1 — Put the site on the VM

Pick the site type: **Part 6** (a Docker platform), **Part 7** (WordPress as a container), or
**Part 8** (your own codebase in a directory). Do that first — the name needs something to point at.

### Step 2 — Tell Traefik the name  *(OWNER, if using Coolify)*

- **If you deployed through Coolify:** open `http://172.28.50.2:8000`, sign in (2FA), go to
  **Projects** → your project → the resource → **Domains**. Type the name **with the scheme** — and for
  a tunnelled site that scheme is **`http://`**:

  ```text
  http://shop.yourdomain.com
  ```

  Press Enter, then **Save domain**. Redeploy, or let it redeploy on save.
- **If you deployed as a directory site (Part 8):** the name is already in the site's compose file —
  you set it when you created the site. Nothing to do here.

#### Why `http://` and not `https://` — measured from Coolify's own source

This looks wrong and it is right. Read from the running Coolify 4.3.23
(`bootstrap/helpers/docker.php`, function `fqdnLabelsForTraefik`):

| You type | What Coolify actually creates |
|---|---|
| `https://shop.yourdomain.com` | a router on **`entryPoints=https`** (port 443) with `tls=true` and `tls.certresolver=letsencrypt`, **plus** an http router on port 80 that **redirects to https** when "Force HTTPS" is on |
| `http://shop.yourdomain.com` | one router on **`entryPoints=http`** (port 80). No TLS, no redirect. |

**The tunnel connects to `http://localhost:80`.** So the router that matters is the one on the **http**
entrypoint, and writing `https://` gets you two problems:

1. **A redirect loop, if "Force HTTPS" is on.** The tunnel delivers to port 80 → that router answers
   `301` to `https://…` → Cloudflare sends the browser there → the browser returns through the tunnel →
   port 80 → `301` again. The browser eventually gives up with *too many redirects*.
2. **A failing certificate job.** `tls.certresolver=letsencrypt` makes Traefik try to obtain a
   certificate, and it cannot: the HTTP challenge needs the name reachable from the internet, and
   nothing reaches this VM inbound (measured — manual §4). The certificate is not needed anyway, because
   **Cloudflare already provides it**.

**The public HTTPS is Cloudflare's, not Traefik's.** That is the whole reason the scheme you type here is
`http://` even though visitors will use `https://`.

> **Always include a scheme.** Coolify's parser reads the scheme to find the host; a bare
> `shop.yourdomain.com` is not worth the risk.
> **For `.test` names, `http://` is also correct** — same reason, plus Let's Encrypt cannot validate a
> name that does not exist.

### Step 3 — Add the route at Cloudflare

Tunnel → **Routes** → **Add route** → **Published application** → Subdomain `shop`, Domain
`yourdomain.com`, Service URL `http://localhost:80` → **Add route**.

### Step 4 — Prove it

From the laptop:

```bash
curl -sS --noproxy '*' -o /dev/null -w 'http_code=%{http_code}\n' https://shop.yourdomain.com/
```

**What you should see:** anything except `000` and not a `404` from Traefik. A `404` means the name
reached the VM but no container claimed it — go back to Step 2.

---

## Part 4 — Add the bare domain: `yourdomain.com`

Two things are different about the bare domain, and both catch people out.

**1. DNS at the apex.** A plain `CNAME` is not normally allowed at the root of a domain. Cloudflare
makes it legal — from Cloudflare's own docs: *"Cloudflare's CNAME flattening allows you to create CNAME
records at your zone apex."* In practice you do not type records at all: in the tunnel's
**Add route** screen you simply **leave the Subdomain box empty** and pick the domain.

If you ever add the record by hand instead: type `CNAME`, **Name** `@`, **Target**
`<tunnel-id>.cfargotunnel.com`, **Proxy status** Proxied.

**2. Traefik must claim the bare name.** The Domains field (or the site's compose label) must contain
`Host('yourdomain.com')` — **not** `www.yourdomain.com`.

**3. Decide about `www`.** They are two different names. The usual arrangement is: the bare domain is
the real site, and `www` redirects to it. Do that with a **Cloudflare Redirect Rule** (Rules → Redirect
Rules), or add both names to the Domains field and let the site handle it.

---

## Part 5 — SSL / HTTPS

**On Route A there is nothing to do, and it is already proven.**

Cloudflare terminates TLS at its edge, so the browser sees a valid, publicly trusted certificate, and
nothing on the VM needs one. Cloudflare issues free Universal SSL certificates to every domain added to
it.

**The one consequence to remember:** because Cloudflare does the TLS, the origin is reached over plain
HTTP — so the site's Traefik router must be on the **http** entrypoint. That is why Part 3 tells you to
type `http://` in Coolify's Domains field even though visitors will use `https://`. Getting this backwards
is the most likely reason a site works on `.test` and then fails on a real domain.

**PROVEN 2026-10-05.** A directory-based site was published through a tunnel and fetched from the laptop:

```
http_code=200   bytes=138   time=0.19s   ssl_verify=0      <- 0 means the certificate validated
Server: cloudflare   CF-Ray: a45b28f77fc92d96-ARN   CF-Cache-Status: DYNAMIC
certificate: CN=trycloudflare.com, issuer=Google Trust Services
```

How to check your own domain later:

```bash
curl -sS --noproxy '*' -o /dev/null -w 'code=%{http_code} ssl_verify=%{ssl_verify_result}\n' \
  https://shop.yourdomain.com/
```

`ssl_verify=0` means the browser will show no warning. Anything else means it will.

**The other kind of SSL (Route B, direct to the origin).** Traefik can fetch its own Let's Encrypt
certificate, but it needs the name to resolve publicly **and** port 80 or 443 to be reachable from the
internet. **The second half is measured false on this VM** — three independent outside hosts failed to
reach port 80. So this path cannot work here until a router port-forward exists. It has never been
exercised.

---

## Part 6 — Site type A: another Docker platform

This is the pattern the Companai platform itself uses. Full detail is in the manual §10; the short form:

1. **Get the image onto the VM** — `docker save <image> | ssh -i ./id_ed25519 ramzi@172.28.50.2 'docker load'`.
   **Check `df -h /` first** — 6.4 GB free, measured.
2. **Make a directory** under `/opt/<name>`, put the compose file and `.env` there.
3. **Add the `coolify` network and Traefik labels** (see the manual §10 for the exact block).
   > **Compose *replaces* a service's `networks` list, it does not merge it.** Repeat the base file's
   > networks, or the service drops off its own bridge and can no longer find its database by name.
4. **Start it:** `docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --no-build`
5. **Prove it** — `curl -H 'Host: <name>' http://127.0.0.1/` from inside the VM, then the real URL.

A working example of exactly this is `/opt/companai-platform`.

---

## Part 7 — Site type B: WordPress as a container

WordPress is promised by the canonical architecture §16 as *WordPress + MariaDB* through Coolify's
template, and **it is proven working here** — the manual records `Host: wp.test` returning
`302 → /wp-admin/install.php`, then `200` with the WordPress installer.

**Steps** *(OWNER — needs the Coolify dashboard)*:

1. Coolify → **Projects** → your project → **Add resource** → **Services**.
2. Search `wordpress` and pick the entry that **includes MariaDB**.
3. Deploy. Coolify creates the WordPress container **and** its database together and wires them up.
4. Set the resource's **Domains** field: `https://wp.yourdomain.com`.
5. Add the route at Cloudflare (Part 3, Step 3).
6. Open `https://wp.yourdomain.com/wp-admin/install.php` and finish the WordPress installer.

`wordpress:latest` (1.12 GB) and `mariadb:11` are **already on the VM**, so this needs no download.

**Restoring a WordPress backup** (architecture §17): create the resource → restore the database through
Coolify's **Import Backup** workflow → restore the persistent files → set the domain → then check
`wp-admin`, media, permalinks, HTTPS and database connectivity.

---

## Part 8 — Site type C: your own codebase in a directory  *(PROVEN TODAY)*

**This did not exist on the VM before today.** It is the Plesk-style model you described: a domain gets
its own directory, you upload your codebase into it, and it is served. Built and proven 2026-10-05.

### How it works

```
/opt/sites/<site-name>/
├── docker-compose.yml      <- written for you by the script
└── public/                 <- YOUR CODE GOES HERE
    └── index.php
```

One directory per site. One small container per site, mounting that directory. The directory is
**mounted**, not copied, so **editing a file on the VM changes the live site immediately — no rebuild,
no redeploy.** That is the whole point, and it is proven below.

### Create a site

The helper script is on the VM at `/opt/sites/new-site.sh`:

```bash
ssh -i ./id_ed25519 ramzi@172.28.50.2 '/opt/sites/new-site.sh myshop shop.yourdomain.com'
```

It prints where the web root is. Then add the route at Cloudflare (Part 3, Step 3) — the Traefik label
already carries the name you passed in, so there is nothing to do in Coolify.

> The name you pass becomes a Traefik rule, so it must match the public name exactly.

### Upload your codebase

From the laptop, into that site's own directory:

```bash
cd "C:/Users/Ramzi/Downloads/companai/vms"
scp -i ./id_ed25519 -r ./myshop-codebase/. ramzi@172.28.50.2:/opt/sites/myshop/public/
```

It is live immediately. Confirm the files arrived:

```bash
ssh -i ./id_ed25519 ramzi@172.28.50.2 'ls -la /opt/sites/myshop/public/'
```

### WordPress in a directory (the migration case)

Same directory, WordPress's files instead of yours:

```bash
ssh -i ./id_ed25519 ramzi@172.28.50.2 'bash -s' <<'EOF'
cd /opt/sites/myshop/public
curl -sSL -o wp.tar.gz https://wordpress.org/latest.tar.gz
tar xzf wp.tar.gz --strip-components=1
rm wp.tar.gz
ls
EOF
```

Then create a database (Part 9), put its details into `wp-config.php`, import your dump through
phpMyAdmin, and open the site. **This is the Plesk workflow you described, and the directory half of it
is proven.**

### What was measured

```
=== each hostname serves ITS OWN directory, not a shared one ===
demo.test   -> I am demo-site, served from /opt/sites/demo-site/public
second.test -> I am second-site, served from /opt/sites/second-site/public

=== a file only in demo-site is NOT served on second.test ===
404

=== a host-side edit appears live in the served page (no rebuild) ===
live edit at 08:45:31 from /var/www/html

=== and the whole chain, publicly, over HTTPS ===
http_code=200  bytes=138  ssl_verify=0   (fetched from the laptop)
```

Two example sites are running and left in place so you can look at them:
`/opt/sites/demo-site` and `/opt/sites/second-site`.

**The image** is `php:8.3-apache` (pulled today, PHP 8.3.35, Apache 2.4.68). For a static-only site,
swap it for `nginx:alpine`, which is already on the VM.

---

## Part 9 — Databases and phpMyAdmin

### Create a database  *(OWNER — Coolify dashboard)*

Project → **Add resource** → **Databases** → choose from **PostgreSQL · MySQL · MariaDB · Redis ·
KeyDB · Dragonfly · MongoDB · ClickHouse**.

The credentials appear as environment variables on the database's page, along with an **internal
hostname**. Point the site at that hostname — both containers sit on the same `coolify` network, so the
site reaches the database **by name**. No IP addresses, and nothing published outside.

**PROVEN 2026-10-04:** a second database was created beside the first, a row written into it, and a
separate container reached it by name and read the row back.

### phpMyAdmin

Coolify ships it as a one-click service: project → **Add resource** → **Services** → search
`phpmyadmin`. The image (`lscr.io/linuxserver/phpmyadmin:latest`, 251 MB) is already on the VM.

The template sets `PMA_ARBITRARY=1`, so **one phpMyAdmin administers every database on the machine** —
the login screen accepts any host you type.

| Login field | What to put |
|---|---|
| **Server** | the database's internal hostname, from its Coolify page |
| **Username** | the database user |
| **Password** | the database password |

**PROVEN 2026-10-04:** a full login with `Host: pma.test`; the title came back
`pma.test / mariadb | phpMyAdmin 5.2.3`, `Server: mariadb:3306`, both databases listed, live session.

> **Do not expose phpMyAdmin publicly.** The canonical architecture says so directly. Reach it over the
> local network, or through the tunnel only while you need it, and remove it afterwards.

---

## Part 10 — The verification checklist

Run these from the laptop before you believe anything works. Each one answers a different question.

```bash
cd "C:/Users/Ramzi/Downloads/companai/vms"
H=shop.yourdomain.com

# 1. Does the name resolve?  (public DNS — the only honest test)
nslookup $H 8.8.8.8

# 2. Does the name reach the VM, and does a container claim it?
ssh -i ./id_ed25519 ramzi@172.28.50.2 "curl -s --noproxy '*' -o /dev/null -w 'via Traefik: %{http_code}\n' -H 'Host: $H' http://127.0.0.1/"

# 3. Is it live publicly, and is the certificate good?
curl -sS --noproxy '*' -o /dev/null -w 'public: %{http_code}  ssl_verify=%{ssl_verify_result}\n' https://$H/

# 4. Is the tunnel healthy?
ssh -i ./id_ed25519 ramzi@172.28.50.2 'sudo systemctl is-active cloudflared'

# 5. Is the container up, and on the right network?
ssh -i ./id_ed25519 ramzi@172.28.50.2 'docker ps --format "{{.Names}}  {{.Status}}"'
```

**Reading the results:**

| Symptom | What it means |
|---|---|
| Step 1 shows GoDaddy nameservers | Part 1 is not done, or has not propagated. Nothing else can work. |
| Step 2 `404` | the name reached Traefik but no container claimed it — fix the Domains field / compose label |
| Step 2 `502`/`503` | the container is down, or not on the `coolify` network |
| Step 3 `000` | the tunnel is not running, or has no route for that name |
| Step 3 `ssl_verify` not `0` | the name is not proxied by Cloudflare |

---

## Part 11 — Removing a site

```bash
# a directory site
ssh -i ./id_ed25519 ramzi@172.28.50.2 'cd /opt/sites/myshop && docker compose down'
ssh -i ./id_ed25519 ramzi@172.28.50.2 'rm -rf /opt/sites/myshop'      # also deletes the codebase
```

Then delete the route in the tunnel's **Routes** tab, so Cloudflare stops sending that name.

**Do not** run `docker compose down -v` anywhere unless you mean to delete that stack's data.

---

## Part 12 — What is proven, and what is not

**PROVEN on this VM, today:**

- A site in its own directory is served, routed by name, and each site gets its **own** directory.
- A file in one site is **not** served by another (`404`, measured).
- Editing a file on the VM changes the live site **without a rebuild**.
- The whole chain works publicly over **HTTPS** with a **valid certificate** (`ssl_verify=0`), fetched
  from the laptop.
- Traefik routes by the `Host` header — the mechanism all of this depends on.
- Databases are reachable by name, and phpMyAdmin administers them.
- WordPress deploys through Coolify and reaches its installer.

**NOT proven — do not rely on these yet:**

1. **The GoDaddy → Cloudflare nameserver move has never been done by us.** Part 1 comes from GoDaddy's
   and Cloudflare's own help pages. The first domain you move is the test.
2. **A named tunnel on your own domain has never been run here.** Public HTTPS is proven, but through a
   *quick* tunnel (`*.trycloudflare.com`), not a named one. The difference is a token and a dashboard
   route, but it is a difference.
3. **Let's Encrypt at the origin** (Route B) is untested and **cannot** work until a router
   port-forward exists.
4. **A real host reboot** — the tunnel service and container restart behaviour has not been exercised.
5. **The visitor's IP reaching the application.** Measured, and it does *not*: Traefik replaces
   `X-Forwarded-For` with the internal bridge gateway, so the app's rate limiter cannot tell callers
   apart. Detail and the fix are in `RUNBOOK-deploying-a-site.md` §10.

---

## Ground rules, repeated because they matter

1. **Prove it, do not assume it.** Every step above has a command that shows whether it worked.
2. **DNS is not on this VM** and cannot be. Two jobs, two places (manual §4).
3. **`curl --noproxy '*'`** for every local address on this laptop — the laptop has a proxy set, and
   without this flag you measure the proxy instead of the server.
4. **Check `df -h /` before pulling images.** 6.4 GB free.
5. **Never install Plesk, CasaOS or Nginx Proxy Manager** — they fight Coolify for ports 80/443.

---

## Appendix A — `new-site.sh`, in full

The helper from Part 8 is on the VM at `/opt/sites/new-site.sh`. It is reproduced here so this document
is self-sufficient, and it is also tracked in the project at
`workspace/scripts/vm-platform/new-site.sh`. If the VM is rebuilt, recreate it from this text:

```bash
sudo mkdir -p /opt/sites && sudo chown ramzi:ramzi /opt/sites
# paste the script below into /opt/sites/new-site.sh, then:
chmod +x /opt/sites/new-site.sh
```

```bash
#!/usr/bin/env bash
# Create a new "site in a directory" on this VM.
#
#   ./new-site.sh <site-name> <hostname>
#   ./new-site.sh myshop shop.example.com
#
# It makes /opt/sites/<site-name>/public, drops a proof page in it, writes a
# compose file that puts a PHP container on the `coolify` network with the right
# Traefik label, and starts it.  Then you upload your codebase into that public/
# directory.  Nothing needs rebuilding when you change the files.
#
# Remove a site with:   cd /opt/sites/<site-name> && docker compose down
# and then delete the directory.

set -euo pipefail

name="${1:-}"
host="${2:-}"
if [ -z "$name" ] || [ -z "$host" ]; then
  echo "usage: $0 <site-name> <hostname>" >&2
  exit 2
fi
if ! printf '%s' "$name" | grep -qE '^[a-z0-9][a-z0-9-]*$'; then
  echo "site-name must be lowercase letters, digits and dashes: $name" >&2
  exit 2
fi
if ! printf '%s' "$host" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9.-]*$'; then
  echo "hostname looks wrong: $host" >&2
  exit 2
fi

root="/opt/sites/$name"
if [ -e "$root" ]; then
  echo "already exists: $root" >&2
  exit 1
fi

mkdir -p "$root/public"

cat > "$root/public/index.php" <<'PHP'
<?php
// Proof page — replace this with your own codebase.
header('Content-Type: text/plain; charset=utf-8');
echo "PHP is running.\n";
echo "host header : " . ($_SERVER['HTTP_HOST'] ?? '(none)') . "\n";
echo "directory   : " . __DIR__ . "\n";
echo "php version : " . PHP_VERSION . "\n";
PHP

cat > "$root/docker-compose.yml" <<YAML
services:
  web:
    image: php:8.3-apache
    restart: unless-stopped
    volumes:
      - ./public:/var/www/html
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=coolify"
      - "traefik.http.routers.site-$name.entrypoints=http"
      - "traefik.http.routers.site-$name.rule=Host(\`$host\`)"
      - "traefik.http.services.site-$name.loadbalancer.server.port=80"

networks:
  coolify:
    external: true
YAML

cd "$root"
docker compose up -d

echo
echo "created : $root"
echo "web root: $root/public   <-- put your codebase here"
echo "serves  : http://$host/"
```

---

## Appendix B — the VM's scripts are now saved in the project

Found while writing this document: the deployment scripts lived **only** on this laptop and on the VM, in
a folder git ignores (`vms/` — `.gitignore` line 99, because the same folder holds the VM's credentials
and a 4 GB ISO, so it has to stay ignored). `git check-ignore` and `git ls-files` confirmed every one was
ignored and **none** tracked. If either disk died the deployment logic was gone: the runbooks describe
*what* the scripts do, not the code itself.

**Fixed** — they are now tracked in
[`workspace/scripts/vm-platform/`](../../../workspace/scripts/vm-platform/README.md), with a README
explaining each one. **No secrets are in that folder**, checked rather than assumed:

- the VM's login password: **absent**
- the Coolify admin password: **absent**
- the only long hex string present is the **sha256 of `docker-compose.fullapp.yml`**, and it matches the
  file it names — a checksum, not a secret
- `.env` itself is **not** there, and must never be added

Two files were deliberately left out, because they are **copies of the kit's own files** already tracked
in the `starting-kit` repository; duplicating them would create a second source of truth for identical
bytes.

Drift between the tracked copy and the laptop's working copy is now detectable in one command:

```bash
sh workspace/scripts/vm-platform/check-in-step.sh
```
