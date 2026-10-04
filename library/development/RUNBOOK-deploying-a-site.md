# Runbook — deploying a site: domains, subdomains, directories, databases, phpMyAdmin

Companion to [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md). That one covers the machine.
This one covers what you do **on** it.

Everything marked ✅ was measured on 2026-10-04 against the running system. Where something is not yet
proven it says so in plain words — see §8.

---

## 0. The short version

To make a site answer on a name you need exactly two things:

1. **A name that resolves to the VM.** Nothing else works until this is true.
2. **A Coolify resource claiming that name**, so the proxy knows which container to send it to.

Everything else — databases, phpMyAdmin, directories — hangs off those two.

---

## 1. Step 1 — make a name resolve

### Right now: a local name (for testing)

The VM lives on a private network, so no public domain can reach it yet. For testing, point a name at it
from this laptop only, using the Windows hosts file.

Run **once, as Administrator**:

```powershell
cd "C:\Users\Ramzi\Downloads\companai\vms"
.\phase10-test-domains.ps1
```

That adds these and proves each one resolves:

| Name | Goes to |
|---|---|
| `wp.test` | the VM |
| `pma.test` | the VM |
| `app.test` | the VM |
| `whoami.test` | the VM |

**Add more names** by editing the `$Names` list at the top of that script and re-running it — it only
adds what is missing, so it is safe to run repeatedly.

**Undo** with `.\phase10-test-domains-rollback.ps1` (also Administrator). It removes only the lines
that script added, identified by a marker comment, and never touches your own entries.

> `.test` is the reserved TLD for exactly this. Do not use `.local` — Windows reserves it for Bonjour
> and it misbehaves.

### Later: a real domain

A real domain **cannot** point at `172.28.50.2` — that address only exists on this laptop. Public DNS
has to point somewhere the internet can reach, and this VM is behind NAT.

Two ways to fix that, and the plan already chose the second:

- **Port forwarding** on your router to this laptop. Requires a static public IP or dynamic DNS, and it
  exposes the machine directly.
- **Cloudflare Tunnel** — the VM dials *out* to Cloudflare, so nothing is opened inbound and no router
  change is needed. This is the route in the plan. It needs: a domain whose DNS is on Cloudflare, plus a
  tunnel token. **Not started** — that is your open item #5.

Once a real domain resolves to the tunnel, you use it exactly the same way as `wp.test` below, except
you write `https://` instead of `http://` (see §3).

---

## 2. Step 2 — deploy WordPress in Coolify

All labels below are quoted from the running Coolify 4.3.23 source, not remembered.

1. Open `http://172.28.50.2:8000` and sign in.
2. Left sidebar → **Projects**.
3. Top-right button **`New project`** (a `+`). A dialog titled **New Project** opens.
   - **Name** — e.g. `testsites`
   - **Description** — optional
   - Click **`Create project`**.
   - Coolify notes: *"A production environment will be created automatically."* You do not need to make
     one yourself.
4. You are now inside the project. Click **Add resource**.
5. The resource picker appears. It has a search box (placeholder **`Search resources`**) and three
   sections: **Applications**, **Databases**, **Services**.
6. Scroll to **Services**, search `wordpress`, and pick **WordPress** (the entry that includes MariaDB).
   Coolify creates the WordPress container *and* its database together.
7. Wait for the deploy to finish, then open the service and go to its **Domains**.
8. Type `http://wp.test` and click **`Save domain`**.

Then in your browser: **`http://wp.test`** → the WordPress installer.

✅ Verified: a request with `Host: wp.test` returns `302 → /wp-admin/install.php`, and fetching that path
returns `200` with `<title>WordPress › Installation</title>`.

---

## 3. The Domains field — the actual rules

Coolify's own helper text on that field says:

> Add one domain per entry. Press Enter (or type a comma) to add it. You can specify a path and a port
> to bind the domain to.

Read from the running source (`bootstrap/helpers/docker.php`, `fqdnLabelsForTraefik`), each entry is
parsed as `scheme://host[:port][/path]`, and:

| You type | What Coolify does |
|---|---|
| `https://site.example.com` | Route on the **https** entrypoint, with `tls=true` and `tls.certresolver=letsencrypt` → **a real certificate is requested** |
| `http://wp.test` | Route on the **http** entrypoint, **no certificate, no Let's Encrypt** |
| `http://wp.test/files` | Same, but the route is limited to the `/files` path — `PathPrefix('/files')` |
| `http://app.test:3000` | Route to port **3000 inside the container** |

**Two consequences that matter:**

- **For `.test` names, always write `http://`.** Let's Encrypt cannot validate a name that does not exist
  publicly, so an `https://` entry for `wp.test` will try and fail to get a certificate.
- **Always include the scheme.** The parser reads the scheme to find the host. Writing a bare `wp.test`
  is not what the examples show and is not worth the risk — the helper's own examples all carry one.

**The path is how you do "code in a directory".** `http://wp.test/files` claims only that directory,
so a second resource can own it while WordPress keeps the rest of the domain. You do not need to touch
Traefik by hand.

Coolify also warns you if two resources claim the same domain, because only one can win.

---

## 4. Databases

### Creating one

Inside a project → **Add resource** → the **Databases** section. Coolify 4.3.23 offers:

**PostgreSQL · MySQL · MariaDB · Redis · KeyDB · Dragonfly · MongoDB · ClickHouse**

### Or let the service bring its own

The WordPress one-click service already includes MariaDB. That is usually what you want for a WordPress
site: one site, one database, created and wired automatically.

### Linking a database to a site

The database's credentials are exposed as environment variables, and Coolify shows an **internal
hostname** for the database on its page. Point the site's config at that hostname. Because both
containers sit on the same Docker network (`coolify`), the site reaches the database by name — no IP
addresses, no ports published to the outside.

✅ Verified (in the proof stack, §7): a second database was created next to the first, a table was written
into it, and a separate container reached the database **by name** and read it back.

---

## 5. phpMyAdmin

Coolify ships a one-click **phpMyAdmin** service. Deploy it the same way as WordPress (project →
**Add resource** → **Services** → search `phpmyadmin`), then give it a domain such as `http://pma.test`.

The template sets **`PMA_ARBITRARY=1`**, which means the login screen accepts **any host you type** —
so a single phpMyAdmin can administer every database on the machine, not just one.

**To log in:** open `http://pma.test`, and on the login form fill in:

| Field | What to put |
|---|---|
| **Server** (the arbitrary-host box) | the database's internal hostname from its Coolify page |
| **Username** | the database user |
| **Password** | the database password |

✅ Verified: logged in over HTTP with `Host: pma.test`; the page title came back
`pma.test / mariadb | phpMyAdmin 5.2.3`, `Server: mariadb:3306`, and the database list showed both
databases, with a live session (`Log out` present).

---

## 6. Order of operations, once you start

1. Add the name to the hosts file (or, later, to Cloudflare DNS).
2. Create the project, then the resource, in Coolify.
3. Set the domain — `http://name.test` for now.
4. Deploy. Wait for it to go green.
5. Open the name in the browser.
6. If you need to look inside the database, open phpMyAdmin and point it at the database's host.

---

## 7. The proof stack — what I built, and how to remove it

To prove all of the above without touching Coolify, I deployed a **throwaway** stack on the VM at
`/opt/companai-teststack`. It reuses Coolify's own Traefik and its `coolify` network, so it exercises the
real proxy.

It contains: MariaDB, WordPress, phpMyAdmin, and a small nginx. It proves hostname routing, path routing,
database creation, and the phpMyAdmin login.

**Coolify does not know it exists and will not manage it.** Remove it entirely with:

```bash
cd /opt/companai-teststack
sudo docker compose down -v
```

Then delete `/opt/companai-teststack` and `/tmp/teststack`. The `-v` also removes its data volumes.

Throwaway credentials (test only — never reuse): MariaDB user `wpuser` / `wppass`, root `testroot`,
databases `wp_site1` and `site2db`.

---

## 8. What is proven, and what is NOT

### Proven ✅ (all measured 2026-10-04)

| Claim | Evidence |
|---|---|
| The VM can reach the internet and pull images | `docker pull hello-world` → OK; Docker Hub returned `401` (reachable) |
| A hostname reaches the right container | `Host: wp.test` → WordPress installer; `Host: pma.test` → phpMyAdmin; `Host: app.test` → nginx |
| A **directory** under a domain can be routed separately | `Host: wp.test` + `/files/hello.txt` → `200`, served by nginx, not WordPress |
| An unmatched hostname is cleanly rejected | bare request → `404` from Traefik |
| A second database can exist alongside the first | `SHOW DATABASES` → `site2db`, `wp_site1`; row read back from `site2db.proof_of_concept` |
| A separate container reaches the database by name | PHP `mysqli` from the phpMyAdmin container → `connect = OK`, listed both databases |
| phpMyAdmin really works through the proxy | full HTTP login; title `pma.test / mariadb | phpMyAdmin 5.2.3`; both databases listed; live session |
| WordPress serves its installer | `200`, `<title>WordPress › Installation</title>` |

### NOT proven — do not assume these

1. **Coolify's own service deployment.** I proved the *environment* and the *proxy*, using the same
   compose mechanism Coolify uses. I did **not** click through Coolify's own "create service" path,
   because with 2FA on I cannot log into the UI, and minting an API token by editing Coolify's auth
   tables was not worth the risk of locking you out. **Your first Coolify deploy is still the real
   test.** Everything it depends on — image pulls, the network, the proxy, hostname routing — is proven.
2. **phpMyAdmin against a Coolify-managed database.** Proven against a MariaDB on the same network, which
   is the same mechanism, but not against a database created *by Coolify*. That needs one to exist first.
3. **Cloudflare Tunnel / any public access.** Not started. No real domain can reach this VM yet.
4. **TLS certificates.** Untested, and untestable locally: Let's Encrypt needs a publicly resolvable
   name. Every local test therefore used `http://`.
5. **A real host reboot.** The VM's auto-start reads `Start / delay 30` but has never been exercised.

---

## 9. What this means for your goal

You asked to reach the point where you can add domains, put code in directories, create linked
databases, open phpMyAdmin, and test WordPress. **That point is reached**, with one honest caveat:
the *proxy and database half* is proven end-to-end, and the *Coolify clicking half* is documented from
Coolify's own source but has not been walked through by a human yet.

So when you deploy your first real site: if the name resolves and Coolify deploys it, the environment is
doing its job — and anything that then goes wrong is a project problem, which is exactly the
distinction you asked for.
