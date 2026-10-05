# Runbook — `Platform-Server` (Coolify hosting environment)

**Built:** 2026-10-04 · **Plan:** `PLAN-coolify-laptop-implementation.md` · **Architecture:**
`library/canonical-architecture-v2-hybrid-ai-coolify.md`

A self-hosted Coolify (Docker hosting platform) running in an Ubuntu Server 24.04 VM on this
laptop, so a site can be "cloud-checked" locally and shared with testers.

---

## 1. What exists, and where

| Piece | Value |
|---|---|
| Hyper-V VM | `Platform-Server` — Generation 2, 2 vCPU, dynamic memory 3–6 GB, Secure Boot ON |
| Guest OS | Ubuntu **24.04.5 LTS**, kernel 6.8.0-146, hostname `platform-server` |
| Disk | dynamic VHDX, **24 GB maximum**, currently ~8.3 GB used. Location: `…\companai\vms\Platform-Server\` |
| NIC 1 | `Default Switch` — DHCP, **outbound internet** |
| NIC 2 | `AI-Private` — **static `172.28.50.2/24`, no gateway** (the host↔VM link) |
| Docker | **29.8.2** + Compose v5.6.0, `enabled` at boot |
| Coolify | **4.3.23**, dashboard on **port 8000**, Traefik on **80/443** |
| Host switch | `AI-Private` (Internal) — created for this build; `Default Switch` and `WSL` untouched |
| Build area | `C:\Users\Ramzi\Downloads\companai\vms\` — **gitignored** |

Six containers run: `coolify`, `coolify-db` (Postgres 15), `coolify-redis`, `coolify-realtime`,
`coolify-proxy` (Traefik v3.6), `coolify-sentinel`. **All six were verified to return healthy after
a guest reboot.**

---

## 2. How to connect

### SSH
```bash
cd "C:/Users/Ramzi/Downloads/companai/vms"
ssh -i ./id_ed25519 ramzi@<VM-IP>
```
`sudo` needs the VM password (see §3): `echo "$PW" | ssh … 'sudo -S -p "" <command>'`.

### ⚠ The DHCP address changes — this bit us once
`eth0` (Default Switch) is **DHCP**, and the address **changed across a reboot**
(`172.19.120.91` → `172.19.122.65`). Do not hard-code it. Get the current one from the host:

```powershell
(Get-VMNetworkAdapter -VMName "Platform-Server" | Where-Object Name -eq "Network Adapter").IPAddresses
```

**Use the stable address — it works now that Phase 6 is done.** NIC 2 is static and never changes,
so these are the addresses to bookmark:

| Service | Stable URL | Verified |
|---|---|---|
| Coolify dashboard | `http://172.28.50.2:8000` | **302** (redirects to login) ✅ |
| Traefik (hosted sites) | `http://172.28.50.2` | **404** — alive, nothing routed yet ✅ |
| SSH | `ssh -i vms/id_ed25519 ramzi@172.28.50.2` | `platform-server` ✅ |

The DHCP address still works, but **do not bookmark it** — it changes on every reboot. To find the
current one from the host:
```powershell
(Get-VMNetworkAdapter -VMName "Platform-Server" | Where-Object Name -eq "Network Adapter").IPAddresses
```

---

## 3. Credentials

**All of them live in `C:\Users\Ramzi\Downloads\companai\vms\CREDENTIALS.local.txt`** — that folder
is gitignored, so they are never committed.

| What | Where |
|---|---|
| VM user / password | `CREDENTIALS.local.txt` (`ramzi`) |
| VM SSH key | `vms/id_ed25519` (private) + `id_ed25519.pub` |
| Coolify admin | `CREDENTIALS.local.txt` — `admin` / `vpersonmail@gmail.com`, **created 2026-10-04** (this row said "not created yet" until 2026-10-05; §6 records the creation). 2FA is on. The password still needs changing — §6a Task 2 |

---

## 4. Daily operations (inside the VM)

```bash
sudo systemctl status docker
docker ps                      # what is running
docker compose -f /data/coolify/source/docker-compose.yml \
               -f /data/coolify/source/docker-compose.prod.yml ps
sudo systemctl restart docker  # restarts everything (all six have a restart policy or are app-managed)
df -h /                        # guest disk
docker system df               # what Docker is using
```

**Start / stop the VM from the host (no elevation needed):**
```powershell
Start-VM  -Name "Platform-Server"
Stop-VM   -Name "Platform-Server"          # graceful
Stop-VM   -Name "Platform-Server" -TurnOff # hard, only if hung
```

**Automatic behaviour, verified:** the VM **auto-starts** with the host (30 s delay) and **auto-stops
gracefully** with the host; `AutomaticCheckpointsEnabled = $false` and there are **zero checkpoints**
(a checkpoint is not a backup and silently doubles disk use).

---

## 5. Health checks

```bash
# from the host
curl --noproxy '*' -s -o /dev/null -w "%{http_code}\n" http://<VM-IP>:8000/   # expect 302
curl --noproxy '*' -s -o /dev/null -w "%{http_code}\n" http://<VM-IP>:80/     # expect 404 (Traefik alive, no routes)
```
`302` on `/` means the dashboard is up. `404` on port 80 means Traefik is up with nothing routed yet.

> **Note for the host:** this laptop has `http_proxy` set. Always use `curl --noproxy '*'` when
> probing a local or LAN address, otherwise you measure the proxy, not the server.

---

## 6. What is deliberately NOT done yet

1. **The Coolify admin account — DONE (2026-10-04).** Created in the browser as `admin` /
   `vpersonmail@gmail.com`. **Registration is now closed** (`is_registration_enabled = false`), so the
   open window is shut. *(Background: the installer's pre-set credentials were rejected by Coolify's
   own validator — the email must pass `email:rfc,dns`, i.e. the domain must actually resolve, and the
   password must contain a symbol. Its log said `ERROR  Invalid Root User Environment Variables`. Those
   three lines are commented out in `/data/coolify/source/.env`, backup `.env-pre-phase7-backup`.)*
   **2FA is ON (enabled by the owner 2026-10-04 12:44:46)** — `two_factor_confirmed_at` is set, a
   `two_factor_secret` and recovery codes exist, and a live login attempt with the password now stops
   at `/two-factor-challenge` instead of granting a session. Two independent confirmations.
   **Still to do: change the password.** Tested 2026-10-04: the previously exposed password
   **still authenticates** — 2FA is the only thing blocking it. See §6a Task 2.
   *(The password itself was written out in this file until 2026-10-04. It has been redacted. Note
   that redacting the text does **not** remove it from this repository's git history, and it was also
   sent in a chat message — so **changing it is the fix**, not deleting the text. That is Task 2.)*
2. **The Coolify onboarding wizard** — three steps: *Server connection*, *Docker environment*,
   *Project structure*. The first two are already satisfied (`localhost` server, Docker validated);
   the third creates a project + environment, which is what you need before deploying anything.
   See §7a.
3. **Phase 6 — the private AI network. DONE and verified.** See §7.
4. **`.wslconfig` — DONE (2026-10-04).** Applied while WSL was idle, so nothing was disturbed.
   See §6b.
5. **Deploying an application**, WordPress, and Cloudflare Tunnel — application decisions, not
   environment ones. **The deployment half is now documented, and its plumbing is proven** — see
   [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md).

**→ Exact click-by-click steps for everything above are in §6a.**

**→ For deploying a site (domains, subdomains, directories, databases, phpMyAdmin), see the companion
runbook [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md).**

---

## 6a. Your tasks — exact steps

Status of each task, so nothing is left vague:

| # | Task | Status | Whose job |
|---|---|---|---|
| 1 | Turn on 2FA | **FIXED 2026-10-04 12:44:46** — verified two ways | done |
| 2 | Change the Coolify password | **OPEN — the exposed password still logs in** | **You** |
| 3 | The ⚠ triangle on the `localhost` card | **NOT AN ISSUE** — Traefik update notice only | nobody |
| 4 | Create a project | **WILL DO when you deploy** — not needed yet | **You**, later |
| 5 | Delete the 3.8 GB ISO | **KEEP IT** — it is the reinstall route, 83 GB free | nobody |
| 6 | `.wslconfig` resource cap | **FIXED 2026-10-04** — see §6b | done |

### Task 1 — Turn on 2FA — ✅ DONE 2026-10-04 12:44:46

Kept below for reference (e.g. if you replace the phone and need to set it up again).

**What "2FA" means.** Right now, your password alone gets anyone in. 2FA adds a second step: a
6-digit code from an app on your phone that changes every 30 seconds. So a stolen password on its own
is no longer enough.

**Steps.**
1. On your **phone**, install a free authenticator app — **Google Authenticator**, **Microsoft
   Authenticator**, or **Authy**. Any of them works.
2. On the laptop, in Coolify click **`admin`** at the bottom-left, then **Profile**.
   (Or go straight to `http://172.28.50.2:8000/profile` — the **static** address, which never
   changes. Do **not** use the DHCP address for this; see §2.)
3. Find the **Two-factor authentication** section — it says *"Two-factor authentication is off"*.
   Click **Configure 2FA**.
4. A **QR code** appears under the heading **Finish setup**. In the app choose *Add account → Scan QR
   code* and point the phone at the screen.
5. The app now shows a 6-digit code. Type it into the **One-time code** box and click **Validate 2FA**.
6. The page then shows **recovery codes**. **Save them somewhere safe** — a password manager, or print
   them. They are the only way back in if you lose the phone.

*If the QR code will not scan:* click **Show manual setup** and type the text code it reveals into the
app instead.

### Task 2 — Change the Coolify password — **OPEN, and the only thing left for you**

Same **Profile** page → the **Password** section → fill in **Current password**, **New password**,
**Confirm new password** → click **Change password**. It signs out every active session, including the
current one.

**Why it still matters, measured 2026-10-04:** a login attempt with the current password
**succeeded at the credential check** — it only stopped because 2FA asked for the 6-digit code. So a
password that has been written into this repository's history and sent in a chat message is still
live. 2FA is doing the protecting right now; the password itself is still exposed. Change it and the
exposure stops mattering. *(The literal password was redacted from this file on 2026-10-04. Redacting
the text does not remove it from git history — changing the password is the fix.)*

### Task 3 — The ⚠ triangle on the `localhost` server card

**Not a fault, and nothing to do.** It is Coolify telling you the web proxy (Traefik) has an update
available. Clear it if you like via **Servers → localhost → Proxy**; nothing depends on it.

**Why this is certain** (re-measured from the Coolify database 2026-10-04, not inferred):

The Servers list shows `Attention required` / `warning` when
`is_ready AND proxy_is_set AND (proxy_status != "running" OR traefik_is_outdated)`
(`resources/views/livewire/server/index.blade.php`). Every term except the last was measured false:

| Term | Measured | Result |
|---|---|---|
| `is_reachable` / `is_usable` / `force_disabled` | `t` / `t` / `f` | ready ✅ |
| `proxy.status` | `running` | not the cause |
| `sentinel_updated_at` vs now | 18 s old | sentinel live, not the cause |
| `detected_traefik_version` | `3.6.25` | — |
| `traefik_outdated_info` | `{"current":"3.6.25","latest":"3.7.13","type":"minor_upgrade"}` | **this is the cause** |

So the ⚠ is the Traefik version notice and nothing else.

### Task 4 — Create a project (only when you actually want to deploy something)

**Projects → New**. A project is just a folder that holds applications — creating one deploys nothing.

### Task 5 — The 3.8 GB installer ISO — **KEEP IT**

Recommendation: **do not delete it.** It is the media you need to rebuild the VM if the disk is ever
lost, and C: has **83 GB free** (measured 2026-10-04), so the 3.8 GB is not costing you anything you
need. Re-downloading it would take far longer than the space is worth.

If you ever do want the space back:
```powershell
Remove-Item "C:\Users\Ramzi\Downloads\companai\vms\ubuntu-24.04.5-live-server-amd64.iso"
```

---

## 6b. `.wslconfig` — the WSL2 resource cap (**applied and verified 2026-10-04**)

**What it does.** WSL2 (which is where Docker Desktop's engine runs) is a small virtual machine. It is
given a large slice of your RAM by default — Microsoft's documented default is **50% of total memory**
(some older WSL builds used 80%, and that older figure is still repeated widely online). This machine
has 32 GB, so that is about **16 GB** — and the `Platform-Server` VM also takes up to 6 GB. Worst case
22 GB of 32, leaving ~10 GB for Windows. The file caps WSL2 at **16 GB**, which is *the default it was
already getting* — the point is that it is now **explicit and reviewable** rather than whatever the
installed WSL build happens to choose.

**A correction to this section, made 2026-10-04.** It first said `memory=12GB`, and the reason was
wrong. 12 GB would have *starved* the stack: a measurement already on this page shows the local model
container alone using **~10 GiB** of a Docker VM that was **15.56 GiB**. Cutting the VM to 12 GB would
have caused out-of-memory kills mid-run, which read like a bug in our own code. Raised to **16 GB**,
which is the size the stack was actually proven at. Budget: Windows ~10, the Coolify VM up to 6, WSL
up to 16 → worst case 22 of 32. **A ceiling is not a reservation** — WSL only takes what it uses.

**What was measured before writing it:** Windows 10 Pro 19045 · 32 GB RAM · 8 logical CPUs (i7-6820HQ)
· Docker Desktop 4.93.0 · only WSL distro is `docker-desktop` · no pre-existing `.wslconfig` (so
nothing of yours was overwritten) · Platform-Server VM = 4 GB startup / 6 GB assigned, dynamic memory
on.

**What is in `C:\Users\Ramzi\.wslconfig`:**

```ini
[wsl2]
memory=16GB
processors=4
swap=4GB
```

**Verified, not assumed — 2026-10-04 evening.** The file only takes effect when WSL next starts, so it
sat untested until Docker Desktop was restarted. It has now been restarted, and the Docker machine
reports exactly what the file asks for:

| | File says | Docker machine reports |
|---|---|---|
| CPUs | `processors=4` | **4** |
| Memory | `memory=16GB` | **15.62 GiB** (16 GB = 15.62 GiB) |

So the cap is **active and correct**, and the earlier "NOT YET EXERCISED" caveat no longer applies.

**If you want different numbers:** edit that file. Keep `memory` plus the VM's 6 GB comfortably under
32 GB. To remove the cap entirely, delete the file — WSL2 returns to its default ceiling.

---

## 7. The private AI network (Phase 6) — **DONE and verified 2026-10-04**

The owner ran `phase6-ai-network-build.ps1` as Administrator. It added exactly two things, and both
were re-measured afterwards:

| Item | Measured |
|---|---|
| Host IP | `172.28.50.1/24` on `vEthernet (AI-Private)`, `prefixOrigin=Manual` ✅ |
| Firewall rule | `AI model from Coolify VM`, Enabled, In, TCP, LocalPort 8080, **RemoteIP `172.28.50.2-172.28.50.2`** ✅ |

**The link was proved with real traffic, not a config read.** A listener was started on the host bound
to `172.28.50.1:8080`, and from inside the guest:

```
TCP connect 172.28.50.1:8080 -> OK
HTTP 200
```
and the host's own listener log recorded the client:
```
172.28.50.2 - - [04/Oct/2026 14:25:17] "GET / HTTP/1.1" 200 -
```

### ⚠ `ping` to the host fails, and that is not a fault
`ping -c3 172.28.50.1` from the guest returns **100% packet loss**. Windows Firewall blocks inbound
ICMP by default and the Phase 6 rule deliberately allows only TCP 8080. **Test the link with TCP, not
ping.** The plan originally listed "the VM pings the host" as the check — that criterion was wrong and
has been corrected.

**Undo** — same elevated window: `.\phase6-ai-network-rollback.ps1`. It removes **only** those two
items, by exact name and exact address, and leaves the `AI-Private` switch in place.

> **One thing to know:** the firewall rule alone does not make the AI link *serve* anything. The model
> server on Windows must bind to `172.28.50.1` (or `0.0.0.0`), not `127.0.0.1`. That is a compose-file
> change for later — **no model runs yet.**

---

## 7a. The Coolify onboarding wizard — what each step does

The screen after first login says *"Connect your first server and start deploying in minutes"* with
three steps. All three are safe to walk through; **Continue** is the right button.

| Step | What it wants | What to do here |
|---|---|---|
| **Server connection** | An SSH-reachable host to deploy onto | **Use the existing `localhost`.** It is already configured — `host.docker.internal`, **user `root`**, port 22, with a private key — and the connection was tested and works (`root@host.docker.internal` → `SSH_OK`). **Do not add a new server.** |
| **Docker environment** | Validate the deployment runtime | Let it validate. Docker 29.8.2 is installed and running, so this passes. |
| **Project structure** | Create a project and its first environment | Give it a name. This is just an organising folder — pick something meaningful (e.g. project `companai`, environment `production`). Nothing is deployed by this step. |

**Skip setup** is the alternative if you would rather configure by hand later; it only skips creating
the project/environment, which you can create at any time from the UI.

**Afterwards, two things worth doing straight away:**
1. **Turn on 2FA** (Settings → Security). It is currently **off**.
2. **Change the password** — it was typed into a chat message, so treat it as exposed.

**State at the time of writing (measured):** 1 user (`admin`), 0 projects, 0 environments, 1 server
(`localhost`). Registration closed.

---

## 8. Full rollback

**Non-elevated (as your normal user):**
```powershell
Stop-VM   -Name "Platform-Server" -Force -TurnOff
Remove-VM -Name "Platform-Server" -Force
Remove-VMSwitch -Name "AI-Private" -Force
Remove-Item "C:\Users\Ramzi\Downloads\companai\vms\" -Recurse -Force
```
**Elevated:** run `phase6-ai-network-rollback.ps1` first (if Phase 6 was applied).

Nothing in this build modified Windows, Docker Desktop, or any pre-existing file.

---

## 9. Findings, deviations and gotchas (all measured)

| # | Finding |
|---|---|
| 1 | **`cloud-init status` reads `disabled`, not `done`.** Correct and expected: the installer writes `/etc/cloud/cloud-init.disabled`, so cloud-init does not run on the installed system. The install-time run finished — the console shows `Cloud-init v. 25.1.4 … finished … Datasource DataSourceNoCloud`. |
| 2 | **The autoinstall was not fully unattended.** The seed *was* picked up, but subiquity still asks `Continue with autoinstall? (yes/no)` unless `autoinstall` is on the kernel command line. It was answered by hand. The seed itself is at `vms/seed/`. |
| 3 | **`Msvm_Keyboard.TypeText` does not reach the guest.** It returns success and types nothing. Only `PressKey`/`ReleaseKey` with **virtual-key codes** work. Recorded as lesson L59. |
| 4 | **"Drive" is not "hard disk".** A first attempt to put the hard disk first in the boot order moved the empty **DVD** first instead, leaving a latent path where a re-inserted ISO would boot the installer again. Fixed by discriminating on the device type. After the guest's first boot Ubuntu inserted its own EFI entry at the front, so the order is now `File (Ubuntu shim) → HardDiskDrive → DvdDrive`. **The DVD is last, which is the property that matters.** |
| 5 | **The DHCP address moves.** See §2. |
| 6 | **`Get-NetFirewallRule` returns nothing in this session** even though 620 rules exist (`netsh` sees them). Use `netsh advfirewall firewall show rule name=all` for firewall facts. |
| 7 | **The ISO is still on disk** (3.8 GB, `vms\ubuntu-24.04.5-live-server-amd64.iso`). Kept as the route back to a clean reinstall; delete it whenever you want the space back. SHA-256 `97f3d7ffb032c3eb3b23d2c8be9cc76e60c2c1f2c0146ba5ba9fe01cafae0fd8`. |
| 8 | **Coolify's installer warns about disk** (it wants 30 GB total / 20 GB free; the VM has 23/13). It only warns and continues. Docker + Coolify consumed **~3.2 GB**. |
| 9 | **`coolify-proxy` publishes port 8080 but serves nothing** (a phantom publish). Cosmetic. |
| 10 | **Traefik logs absolutely nothing** — `docker logs coolify-proxy` is **0 lines**. Traefik's default level is ERROR and access logs are off, and no errors have occurred. **Consequence: if a site later fails to route, the proxy cannot tell you why.** Read the container's `traefik.*` labels with `docker inspect` instead, or enable access logs. |
| 11 | **Coolify's generated catchall router does not take effect.** `/traefik/dynamic/default_redirect_503.yaml` defines a router `catchall` (`PathPrefix('/')`, `priority: -1000`) pointing at a `noop` service with no servers, which should answer **503**. An unmatched host in fact returns Traefik's own plain **404**. Measured twice (`Host: nomatch.test`, `Host: totally-unknown-name.test`). The file is present and readable, so this is not a mount problem. **Root cause not determined** — Traefik emits no logs (finding 10). Impact is cosmetic: a wrong name still gets a clean 404, not a hang or the wrong site. |
| 12 | **The VM is not reachable from the LAN** — confirmed from the routing table. `eth0` = `172.19.122.65/20` on the Hyper-V **Default Switch**, which is NAT'd and takes no inbound; `eth1` = `172.28.50.2/24` on `AI-Private`, an **internal** (host-only) switch. So `coolify-proxy` binding `0.0.0.0:80/443/8080` is reachable **only from this laptop**. Port 8080 has nothing behind it (finding 9). |

**Exposure surface (measured).** Inside the guest, ports 22, 80, 443, 8000, 6001, 6002 bind to
`0.0.0.0`. From **this laptop** all of them answer. From **anywhere else: nothing** — the guest sits
on the Hyper-V Default Switch NAT with no port-forward and no NAT static mapping. Coolify's open
registration is therefore **only reachable from this laptop**.

---

## 10. Disk budget

| | |
|---|---|
| C: free at end of build | **82.74 GB** (plan's hard stop is 60 GB — clear by 22 GB) |
| VHDX file on disk | 8.29 GB of a 24 GB maximum (dynamic — it only grows as used) |
| Guest `/` | 23 GB total, 9.1 GB used, 13 GB free |
| Docker + Coolify | ~3.2 GB |
| Reclaimable | 3.8 GB (the ISO, §9.7) |

If the guest ever needs more room: stop the VM, `Resize-VHD -Path <vhdx> -SizeBytes 32GB`, start it,
then grow the partition inside (`growpart` + `resize2fs`).

---

## 11. Rebuilding from scratch

The ISO can be re-downloaded from
`https://releases.ubuntu.com/24.04.5/ubuntu-24.04.5-live-server-amd64.iso` and must match SHA-256
`97f3d7ffb032c3eb3b23d2c8be9cc76e60c2c1f2c0146ba5ba9fe01cafae0fd8`.

Every script used is kept in `vms/`: `build_seed.py` (the NoCloud seed), `capture_console.ps1` +
`render_console.py` (read the VM's screen — Hyper-V has no `Get-VMScreenshot`),
`fix_boot_order.ps1`, `phase5_finish.ps1`, and the two Phase 6 scripts.
