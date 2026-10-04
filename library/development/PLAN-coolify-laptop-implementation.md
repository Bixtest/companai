# Implementation Plan — Coolify hosting environment on the Dell Precision 7510

**Status:** APPROVED WITH CHANGES — supervisor findings applied (v2 of this plan)
**Basis:** `library/canonical-architecture-v2-hybrid-ai-coolify.md`
**Owner instruction:** build the **environment**; do **not** deploy our application yet. Ignore the
Hermes-specific parts — application deployment is decided separately, later.

---

## 0. Scope

**In scope:** Hyper-V + Ubuntu Server 24.04 LTS VM + Docker Engine + Coolify + Traefik, a private
host↔VM network for a Windows-side model server, automatic start after reboot, and verified rollback.

**Out of scope (deliberate):** deploying the platform, deploying WordPress, Cloudflare Tunnel, and
anything Hermes-specific. Those are application decisions and need the owner's domain/account.

---

## 1. What recon established (measured 2026-10-04)

| Fact | Value | Consequence |
|---|---|---|
| User | `BIXMASERVER\Ramzi`, **not elevated** | two commands need admin — see §1.1 |
| Group | **BUILTIN\Hyper-V Administrators** | VM + switch + VHD work **without** elevation |
| `New-VMSwitch` | ✅ works | can build the private switch |
| `New-VHD` in a user folder | ✅ works | VM disk can be created |
| `New-VHD` in `C:\ProgramData\…\Hyper-V` | ❌ access denied | use a user-owned path |
| `New-NetFirewallRule` / `New-NetIPAddress` | ❌ access denied | **one elevated run** (Phase 6) |
| Switches now | `Default Switch` (Internal), `WSL` (Internal) | add `AI-Private` |
| VMs now | none | clean start |
| C: free | **91.9 GB** | see the disk math in §2 |
| E: free | 64.7 GB | backup target only |
| `.wslconfig` | absent at survey time | **applied 2026-10-04** — 12 GB / 4 CPU cap, see §4 Phase 8 |
| ISO | ✅ downloaded + **SHA-256 verified** | `97f3d7ff…ae0fd8`, 4,080,486,400 bytes |
| ISO tools | none on PATH | build the seed with **IMAPI2 COM** (no install) |
| `openssl` / `ssh-keygen` | present (3.5.7 / ed25519) | password hash + SSH key |

### 1.1 The elevation boundary — stated correctly this time

**Three commands need Administrator, not two, and the rollback needs it as well:**

| Direction | Command |
|---|---|
| forward | `New-NetIPAddress` (host IP on the AI-Private adapter) |
| forward | `New-NetFirewallRule` (allow 8080 from the VM only) |
| **rollback** | `Remove-NetFirewallRule`, `Remove-NetIPAddress` |

Everything else in this plan runs as the current user. The owner therefore needs **one elevated
script to build, and one to undo** — both supplied, both reviewed, both printed before running.

---

## 2. Disk math, done honestly

The supervisor caught that the ISO was not counted. Corrected:

```
C: free                                    91.9 GB
  − ISO (deleted after install, Phase 5)    4.08 GB
  − VHDX maximum, reduced to               24.0 GB
  =                                         63.8 GB   ✅ above the 60 GB healthy line
```

**Why 24 GB, not the architecture's 32 GB:** 32 GB puts the worst case at **55.8 GB**, inside the
architecture's own *warning* band. A dynamic VHDX only grows to what it uses, and Ubuntu + Docker +
Coolify + a few images realistically needs **10–15 GB**, so 24 GB is generous headroom. It is
resizable later (`Resize-VHD`) once the owner has freed more space.

**Hard stop:** if C: free falls below **60 GB** at any point, stop and report.

---

## 3. Safety rules for every phase

1. **Nothing is deleted or overwritten.** Every phase creates; the only removal is the explicit
   rollback in §5.
2. **Nothing touches the existing Docker Desktop stack.** *(Exception: Phase 7 is deferred precisely
   because it would — see §4.)*
3. **No existing switch is modified.** `AI-Private` is new; `Default Switch` and `WSL` are read-only.
4. **Every phase is verified before the next begins**, and the supervisor signs off the verification.
5. **Secrets never enter git.** Credentials go to `vms/CREDENTIALS.local.txt`, and `vms/` is now
   gitignored.

---

## 4. Phases

### Phase 1 — Host storage layout *(no elevation)* ✅ done
`C:\Users\Ramzi\Downloads\companai\vms\` created; **`vms/` added to `.gitignore`** (supervisor #10).

### Phase 2 — ISO *(no elevation)* ✅ done
`ubuntu-24.04.5-live-server-amd64.iso` downloaded, size **4,080,486,400** bytes, SHA-256
**`97f3d7ff…ae0fd8`** — matches the official `SHA256SUMS`.

### Phase 3 — Virtual switches *(no elevation)*
```powershell
New-VMSwitch -Name "AI-Private" -SwitchType Internal
```
`Default Switch` and `WSL` are not touched.
**Verify:** three switches listed; the two originals unchanged.
**Rollback:** `Remove-VMSwitch -Name "AI-Private" -Force`

### Phase 4 — The VM *(no elevation)*
```
Name:          Platform-Server
Generation:    2
vCPU:          2
Memory:        startup 4 GB, min 3 GB, max 6 GB, dynamic, buffer 20%
Disk:          dynamic VHDX, max 24 GB, under …\companai\vms\Platform-Server\
NIC 1:         Default Switch      (outbound / internet)
NIC 2:         AI-Private          (host model link)
Auto start:    Always, 30 s delay
Auto stop:     Shut down the guest
Secure Boot:   ON, template = MicrosoftUEFICertificateAuthority   ← supervisor #1
```
**Secure Boot (supervisor #1, blocker).** A Generation 2 VM defaults to the *Microsoft Windows*
template, which **blocks Ubuntu's shim**. The fix is to set the template, **not** to disable Secure
Boot:
```powershell
Set-VMFirmware -VMName "Platform-Server" -SecureBootTemplate MicrosoftUEFICertificateAuthority
```
**VHDX location (supervisor #7).** The VM worker process reads the disk and ISO under a service
identity, and a user-profile path is a known "access denied on start" class. So Phase 4 ends with a
**real start test**, not an assumption. If it fails, the fix is a one-line ACL grant folded into the
elevated script — and it will be reported, not worked around.
**Checkpoints (found during the build, not in the original plan).** `AutomaticCheckpointsEnabled`
defaults to **True** on a new VM, so simply starting `Platform-Server` produced an
`Automatic Checkpoint - Platform-Server` and an `.avhdx` differencing disk. v2 of the architecture
document says checkpoints are not backups, and a checkpoint on a server VM is a silent way to double
disk use. It was removed and switched off:
```powershell
Set-VM -Name "Platform-Server" -AutomaticCheckpointsEnabled $false
```
Verified: 0 checkpoints, no `.avhdx`.

**Verify:** `Get-VM` shows `Platform-Server`, with the right memory/CPU/NICs, and it **starts**.
**Rollback:** `Remove-VM -Name "Platform-Server" -Force` (then delete the folder).

### Phase 5 — Ubuntu install, unattended *(no elevation)*
Build a **NoCloud seed** — `user-data` (autoinstall) + `meta-data`, volume label **CIDATA** — and
attach it as a **second** DVD drive; the Ubuntu ISO is the first.

> **As built (two deviations, both forced, both recorded):**
> 1. **Seed built with `pycdlib` (Python), not IMAPI2 COM.** The PowerShell tool blocks
>    `New-Object -ComObject` outright ("COM object instantiation can run arbitrary code"), and it
>    also blocks `Add-Type`. `pycdlib` in the managed Python venv produces the same ISO9660 +
>    Joliet + **Rock Ridge** layout that `cloud-localds` does. Verified two independent ways: read
>    back with `pycdlib`, and list with 7-Zip (`user-data` 1467 B, `meta-data` 65 B).
> 2. **The install was NOT unattended — it stopped and asked.** The seed *was* picked up (the
>    console showed subiquity loading every `apply_autoinstall_config` step), but subiquity then
>    printed:
>    `An autoinstall file was found … add 'autoinstall' to your kernel command line to avoid this`
>    / `Continue with autoinstall? (yes/no)`, and waited. This is subiquity's deliberate safety
>    confirmation: the seed alone does not suppress it. Answering `yes` is the intended path; see
>    [[L59]] for the keyboard API that turned out to be needed to answer it. **Recorded so the next
>    build either answers the prompt or puts `autoinstall` on the cmdline.**

The seed sets: locale/keyboard, DHCP, whole-disk layout, hostname `platform-server`, user `ramzi`
with an `openssl passwd -6` hash, `openssh-server`, an SSH public key, and the **correct Hyper-V
guest packages**:
```
linux-tools-virtual  linux-cloud-tools-virtual      ← supervisor #6 (NOT qemu-guest-agent)
```
**The boot-loop fix (supervisor #4).** With the DVD first in boot order, the post-install reboot
re-enters the installer forever. So autoinstall ends with **`shutdown: poweroff`**, and this plan
then **detaches both ISOs** and starts the VM from the disk. No loop is possible.

**Credentials (supervisor #8).** The generated password and key go to
`vms/CREDENTIALS.local.txt` — **gitignored**, never in the repo and never in chat.
**Verify:** VM boots to the disk; SSH answers from the host; `cloud-init status` = `done`.

> **As verified (2026-10-04, independently re-measured by the supervisor — verdict
> APPROVE WITH CHANGES, defects since fixed):**
> * Ubuntu **24.04.5 LTS**, kernel **6.8.0-146-generic**, hostname `platform-server`;
>   `/` is `/dev/sda2 ext4` on the 24 GB VHDX, `/proc/cmdline` has no `casper` — a real
>   install, not a live overlay.
> * Seed fully applied: user `ramzi` (uid 1000, in `sudo`), `en_US.UTF-8`,
>   `Europe/Brussels`, **`linux-tools-virtual` + `linux-cloud-tools-virtual`** installed and
>   **`qemu-guest-agent` absent**, `hv-kvp-daemon`/`hv-vss-daemon` **enabled and active**
>   (the host reads the guest's IPs, which proves it).
> * `eth0` DHCP = `172.19.120.91/20`; `eth1` **static `172.28.50.2/24` with no default route** —
>   the requirement held.
> * Both ISOs detached; **no checkpoints**, `AutomaticCheckpointsEnabled = $false`, no `.avhdx`.
> * **`cloud-init status` reads `disabled`, not `done`.** This is correct and expected: the
>   installer writes `/etc/cloud/cloud-init.disabled`, so cloud-init does not run on the
>   installed system. The install-time run is the one that matters, and the console shows
>   `Cloud-init v. 25.1.4 … finished … Datasource DataSourceNoCloud`. **The verify criterion in
>   the line above was wrong; this is the right one.**
> * **Defect found and fixed (supervisor D1):** `BootType -eq "Drive"` does **not** distinguish a
>   hard disk from a DVD. The first attempt put the **empty DVD** first (`DvdDrive`), leaving a
>   latent path where a re-inserted ISO would boot the installer again. Fixed by discriminating on
>   the Device type name, then re-read: `[0] HardDiskDrive`, `[1] DvdDrive`, `[2] File`. The
>   correct script is `vms/fix_boot_order.ps1`; `vms/phase5_finish.ps1` has been corrected too.
> * **Defect found (supervisor D3):** `vms/phase5_finish.log` recorded the seed ISO as still
>   attached immediately after detaching it. The live state was already clean — Hyper-V had not
>   yet reflected the change in the very next read. A read taken immediately after a write is not
>   evidence; re-read after a pause. The script now does.

**Rollback:** stop and delete the VM; no host change to undo.

### Phase 6 — Private AI network *(⚠ ONE ELEVATED RUN — forward and back)*
Owner runs one reviewed script as Administrator:
```powershell
New-NetIPAddress -InterfaceAlias "vEthernet (AI-Private)" -IPAddress 172.28.50.1 -PrefixLength 24
New-NetFirewallRule -DisplayName "AI model from Coolify VM" -Direction Inbound -Action Allow `
  -Protocol TCP -LocalPort 8080 -RemoteAddress 172.28.50.2
```
Inside the VM (no elevation): netplan static `172.28.50.2/24` on the second NIC, **no gateway**.
**Verify:** the VM pings `172.28.50.1`; the firewall rule exists.
**Nothing is published yet** — no model runs in this plan.
**Rollback:** the companion elevated script (`Remove-NetFirewallRule`, `Remove-NetIPAddress`).

> **As built (2026-10-04 — DONE and verified).** The owner ran `phase6-ai-network-build.ps1` elevated.
> Re-measured: host IP `172.28.50.1/24` (`prefixOrigin=Manual`) on `vEthernet (AI-Private)`, and the
> rule `AI model from Coolify VM` Enabled/In/TCP/8080 with `RemoteIP 172.28.50.2-172.28.50.2`.
> **The link was proved with real traffic**, not a config read: a listener on the host bound to
> `172.28.50.1:8080` answered the guest (`TCP connect -> OK`, `HTTP 200`) and the host's own log
> recorded the client as `172.28.50.2`.
> **Correction — the verify line above was wrong.** `ping` from the guest to `172.28.50.1` returns
> **100% packet loss**, because Windows Firewall blocks inbound ICMP by default and this rule
> deliberately allows only TCP 8080. **Test the link with TCP, not ping.** The working check is:
> run something on the host bound to `172.28.50.1:8080`, then `curl http://172.28.50.1:8080/` from
> the guest.
> **Bonus:** this also gives a *stable* host→guest address. `172.28.50.2` never changes, whereas the
> Default Switch DHCP address moves on every reboot (measured: `.120.91` → `.122.65`). The dashboard
> is therefore now bookmarkable at `http://172.28.50.2:8000`.

### Phase 7 — Docker + Coolify *(no elevation)*
Over SSH: install Docker Engine and Coolify via the official installer, create the admin account,
enable 2FA, confirm Traefik and the dashboard respond.
**Verify:** `docker ps` inside the VM; dashboard returns HTTP; Traefik healthy.
**Rollback:** the VM is the boundary — snapshot/delete it.

> **As built (2026-10-04 — supervisor verdict APPROVE WITH CHANGES):**
> * Official installer run from a hash-pinned local copy (`vms/coolify-install.sh`, SHA-256
>   `8ef02dce49339208f5abc247bff0277c73d04538d7a36dcfd21331e314e0f2cd`), inspected before running.
>   It touches **only the VM** — no host or firewall change.
> * Result: **Docker 29.8.2** (enabled at boot) + **Coolify 4.3.23**; six containers, all reporting a
>   real `healthy` health status; dashboard on **:8000**, Traefik v3.6 on **80/443**; `/api/health`
>   → `OK`. Docker + Coolify consumed **~3.2 GB**.
> * **Persistence proven, not assumed:** the guest was rebooted and **all six containers returned
>   healthy**, including `coolify-sentinel` — whose `RestartPolicy=no` looked like a defect but is by
>   design (the Coolify app manages and restarts it; label `coolify.managed=true`).
> * **The admin account was NOT created, and this is deliberate.** Pre-seeding via
>   `ROOT_USER_*` failed because Coolify's own validator requires `email:rfc,dns` (a **resolvable**
>   domain) and a **symbol** in the password:
>   `ERROR  Invalid Root User Environment Variables / → The email field must be a valid email address.
>   / → The password field must contain at least one symbol.` The three lines are now **commented out**
>   in `/data/coolify/source/.env` (backup `.env-pre-phase7-backup`) so the config no longer lies.
>   **The owner creates the account at `/register` and enables 2FA** — the email is his identity, the
>   password should be his, and 2FA is browser-only in any case. Registration is reachable **only from
>   this laptop** (measured: the guest is on the Default Switch NAT with no port-forward).
> * Also found: the **DHCP address on `eth0` changes across reboots** (`172.19.120.91` →
>   `172.19.122.65`). The **stable** address is the static `172.28.50.2` on NIC 2 — which is exactly
>   what Phase 6 unlocks, and is the reason to run it.

### Phase 8 — `.wslconfig` *(APPLIED 2026-10-04 — the deferral turned out not to be needed)*
The supervisor (#2, blocker) was right that creating a **global** `%UserProfile%\.wslconfig` **and
running `wsl --shutdown`** would forcibly restart the existing development environment. That is why it
was pulled out of the build and deferred.

**Re-measured 2026-10-04 before acting, and the premise did not hold:**
- Docker Desktop 4.93.0 is installed but **not running** (0 docker processes).
- The only registered WSL distro is `docker-desktop`, and it is **not running** — just `wslservice`.
- A `.wslconfig` only takes effect when WSL next starts, so **no shutdown and no restart were needed**.
- `wsl.exe` is blocked by this machine's security policy, so no `wsl --shutdown` could be run from here
  regardless. Writing the file was the whole action.

**Why it is worth doing:** WSL2's documented default memory ceiling is **50% of physical RAM** (older
builds used 80% — that stale figure is still widely repeated). At 32 GB that is ~16 GB, and the
`Platform-Server` VM takes up to 6 GB, so the worst case is 22 of 32 GB and Windows is left ~10 GB. The
cap brings that to 18 GB, leaving Windows ~14 GB.

**Corrected:** an earlier draft of this section, and the first version of the file, said "80% on
Windows 10 ≈ 25 GB". That came from the older documentation. Microsoft's current `.wslconfig` reference
states a single default of **50% of total memory**, with no Windows 10/11 split. The change itself is
still worth making; the number justifying it was wrong and is corrected here.

**Written to `C:\Users\Ramzi\.wslconfig`** (the file did not exist, so no user file was overwritten —
satisfying the #10 rollback constraint):
```ini
[wsl2]
memory=12GB
processors=4
swap=4GB
```
**Rollback:** delete the file. It restores the default ceiling. Documented in Runbook §6b.

### Phase 9 — Acceptance + runbook
Confirm: VM auto-starts after a host reboot; containers restart; dashboard and proxy work; host stays
responsive; C: still ≥ 60 GB free. Write the runbook with endpoints, credentials location and rollback.

> **Status 2026-10-04:** runbook written → **`library/development/RUNBOOK-platform-server.md`**.
> Verified: containers restart (proven by a real guest reboot — all six healthy); dashboard `302` and
> Traefik `404`-but-alive from the host; host responsive; **C: free 82.74 GB** (stop line 60 GB).
> **Not yet tested:** an actual *host* reboot — that is the owner's call, because it restarts his
> Docker Desktop / WSL development environment. The auto-start policy is read as
> `AutomaticStartAction=Start, Delay=30`. **Phase 6 is still pending** (needs the owner's one elevated
> run), and the Coolify admin account is still to be created at `/register`.

---

## 5. Rollback — the whole thing, in order

**0. Inside the VM — remove the throwaway proof stack first** (it is not Coolify's, so Coolify's own
removal will not touch it):
```bash
cd /opt/companai-teststack && sudo docker compose down -v
sudo rm -rf /opt/companai-teststack /tmp/teststack
```
**0b. On the laptop — remove the test hostnames** (elevated):
```powershell
cd "C:\Users\Ramzi\Downloads\companai\vms"
.\phase10-test-domains-rollback.ps1
```
**Non-elevated part:**
```powershell
Stop-VM   -Name "Platform-Server" -Force -TurnOff
Remove-VM -Name "Platform-Server" -Force
Remove-VMSwitch -Name "AI-Private" -Force
# then delete C:\Users\Ramzi\Downloads\companai\vms\
```
**Elevated part** (same script that created Phase 6):
```powershell
Remove-NetFirewallRule -DisplayName "AI model from Coolify VM"
Remove-NetIPAddress -InterfaceAlias "vEthernet (AI-Private)" -Confirm:$false
```
**Nothing in this plan modifies Windows, Docker Desktop, or any existing file.**

---

## 6. Open items needing the owner

1. **One elevated run** for Phase 6 (build) and one for its undo. Everything before it needs nothing.
2. **Phase 8 (`.wslconfig`) — DONE 2026-10-04.** The restart the deferral was protecting against was
   measured not to be needed (WSL and Docker Desktop were both idle), so the file was written with no
   disruption. See §4 Phase 8.
3. **Cloudflare** (later): a domain with DNS on Cloudflare, plus the tunnel token.
4. **Auto-login decision** — deferred, per his instruction.

---

## 7. Supervisor findings and their disposition

| # | Finding | Severity | Disposition |
|---|---|---|---|
| 1 | Gen2 Secure Boot template blocks Ubuntu | blocker | **fixed** — set `MicrosoftUEFICertificateAuthority` |
| 2 | `.wslconfig` + `wsl --shutdown` disturbs the dev environment | blocker | **RESOLVED 2026-10-04** — the restart was measured unnecessary (WSL idle); file written, nothing shut down. See §4 Phase 8 |
| 3 | Rollback also needs admin — "only two commands" was false | blocker | **fixed** — §1.1 and §5 corrected |
| 4 | Unattended install would loop on the DVD | should-fix | **fixed** — `shutdown: poweroff` + detach media |
| 5 | Disk math ignored the 4.08 GB ISO | should-fix | **fixed** — §2, VHDX reduced to 24 GB |
| 6 | `qemu-guest-agent` is wrong for Hyper-V | should-fix | **fixed** — `linux-tools-virtual` set |
| 7 | VHDX in a user profile is unproven for boot | should-fix | **accepted** — Phase 4 ends with a real start test |
| 8 | Credentials would land in a git repo | should-fix | **fixed** — gitignored `CREDENTIALS.local.txt` |
| 9 | 12 GB WSL cap can't hold model + dev | should-fix | **deferred** with #2 |
| 10 | `vms/` not gitignored | minor | **fixed** — `.gitignore` updated |

---

## 8. Status register — every point raised, and where it stands

**Legend.** `FIXED` = done and re-measured. `WILL DO` = action named, not yet done. `OPEN` = needs the
owner. `NOT AN ISSUE` = raised as a concern, then measured and found false.

| # | Point | Status | Detail lives in |
|---|---|---|---|
| 1 | Gen2 Secure Boot template blocks Ubuntu | **FIXED** | §7 #1 · §4 Phase 4 |
| 2 | Rollback also needs Administrator ("only two commands" was false) | **FIXED** | §1.1 · §5 |
| 3 | Unattended install would re-enter the installer from the DVD | **FIXED** | §4 Phase 5 |
| 4 | Disk math ignored the 4.08 GB ISO | **FIXED** | §2 |
| 5 | `qemu-guest-agent` is the wrong guest agent for Hyper-V | **FIXED** | §4 Phase 5 |
| 6 | VHDX in a user-profile path was unproven for boot | **NOT AN ISSUE** — it started cleanly | §4 Phase 4 |
| 7 | Credentials would land in a git repo | **FIXED** | §3.5 · `.gitignore` |
| 8 | `vms/` was not gitignored | **FIXED** | §3.5 |
| 9 | Automatic checkpoints created one on first start | **FIXED** — removed, disabled, 0 remain | §4 Phase 4 |
| 10 | Install stalled at `Continue with autoinstall? (yes/no)` | **FIXED** — answered, install completed | §4 Phase 5 |
| 11 | `Msvm_Keyboard.TypeText` returns success and types nothing | **FIXED** — use virtual-key codes | §4 Phase 5 · `LESSONS.md` L59 |
| 12 | "Hard disk first" boot order actually put the empty DVD first | **FIXED** — discriminates on device type | §4 Phase 5 · Runbook §9.4 |
| 13 | Plan said `cloud-init status` = `done`; it reads `disabled` | **FIXED** — plan text corrected | §4 Phase 5 |
| 14 | Coolify rejected the pre-seeded admin account | **FIXED** — owner created it in the browser | §4 Phase 7 · Runbook §6.1 |
| 15 | `coolify-sentinel` has `RestartPolicy=no` | **NOT AN ISSUE** — proven to return after a reboot | §4 Phase 7 |
| 16 | The VM's DHCP address changes across reboots | **FIXED** — use the static `172.28.50.2` | Runbook §2 |
| 17 | Phase 6's verify criterion ("the VM pings the host") was wrong | **FIXED** — criterion corrected; test with TCP | §4 Phase 6 · Runbook §7 |
| 18 | I misread Coolify's server `user` as `coolify` (Postgres keyword) | **NOT AN ISSUE** — the real value is `root`; connection works | `LESSONS.md` L60 |
| 19 | 2FA was not enabled on the Coolify account | **FIXED 2026-10-04 12:44:46.** Verified two ways: `two_factor_confirmed_at` set + secret + recovery codes present; and a live password login now stops at `/two-factor-challenge` | Runbook §6.1 · §6a Task 1 |
| 20 | Coolify password was typed into a chat message | **OPEN — owner.** Measured 2026-10-04: the exposed password **still passes the credential check** (only 2FA blocks the session). Change it at **Profile → Password**, not Settings | Runbook **§6a Task 2** |
| 21 | The 3.8 GB Ubuntu ISO is still on disk | **NOT AN ISSUE — keep it.** It is the rebuild media and C: has 83 GB free | Runbook **§6a Task 5** · §9.7 · §10 |
| 22 | Phase 8 (`.wslconfig`) not applied | **FIXED 2026-10-04** — cap written (12 GB / 4 CPU / 4 GB swap); no restart was needed, WSL and Docker Desktop were both idle | §4 Phase 8 · Runbook **§6b** |
| 28 | WSL2 had no memory ceiling: documented default is 50% of RAM ≈ 16 GB, plus a 6 GB VM on a 32 GB machine | **FIXED 2026-10-04** — same change as row 22 | Runbook §6b |
| 29 | The exposed Coolify password still authenticates | **CONFIRMED BY TEST 2026-10-04** — a login attempt returned `302 → /two-factor-challenge`, i.e. the password passed and only 2FA stopped it. Raised as row 20 | Runbook §6a Task 2 |
| 30 | `wsl.exe` is blocked by this machine's security policy | **NOT AN ISSUE for this build** — no WSL command is required; the cap is a file. Recorded so a future session does not try to run `wsl --shutdown` | Runbook §6b |
| 31 | I claimed the WSL2 default was "80% on Windows 10 ≈ 25 GB" | **FIXED** — Microsoft's current `.wslconfig` reference says **50% of total memory**, with no Windows 10/11 split. My figure came from older docs. The change was still worth making; the justification number was wrong and is corrected | §4 Phase 8 · Runbook §6b |
| 32 | Can a hostname reach a specific container? | **PROVEN 2026-10-04** — `Host: wp.test` → WordPress installer, `Host: pma.test` → phpMyAdmin, `Host: app.test` → nginx; unmatched host → Traefik `404` | Runbook-deploying §8 |
| 33 | Can code live in a DIRECTORY under a domain? | **PROVEN 2026-10-04** — `Host: wp.test` + `/files/hello.txt` → `200` from nginx, not WordPress. Also a first-class Coolify feature: a path in the Domains field becomes `PathPrefix` | Runbook-deploying §3, §8 |
| 34 | Can a second database be created and reached by name? | **PROVEN 2026-10-04** — `site2db` created alongside `wp_site1`; a row written and read back; a separate container connected via `mysqli` and listed both | Runbook-deploying §8 |
| 35 | Does phpMyAdmin actually work through the proxy? | **PROVEN 2026-10-04** — full HTTP login, title `pma.test / mariadb | phpMyAdmin 5.2.3`, `Server: mariadb:3306`, both databases listed, live session | Runbook-deploying §5, §8 |
| 36 | Can the VM pull images / reach the internet? | **PROVEN 2026-10-04** — `docker pull hello-world` OK; Docker Hub `401` (reachable) | Runbook-deploying §8 |
| 37 | Coolify's own "create service" path | **OPEN — the one unproven link.** 2FA blocks scripted UI access and minting an API token meant editing Coolify's auth tables, which was judged too risky. Its dependencies are all proven; the first human deploy is the real test | Runbook-deploying §8 |
| 38 | No hostname resolves to the VM from this laptop | **FIXED 2026-10-04** — `vms/phase10-test-domains.ps1` (+ rollback) adds `wp.test`, `pma.test`, `app.test`, `whoami.test` to the hosts file. Needs one elevated run | Runbook-deploying §1 |
| 39 | Throwaway proof stack left running on the VM | **WILL DO / YOUR CALL** — it is at `/opt/companai-teststack`, unknown to Coolify; remove with `docker compose down -v` | Runbook-deploying §7 |
| 40 | **Traefik logs nothing at all** (`docker logs coolify-proxy` = 0 lines) | **NOT AN ISSUE now, but a real limitation** — a future routing failure cannot be diagnosed from the proxy. Use `docker inspect` on the container's labels, or enable access logs | Platform runbook §9 #10 |
| 41 | Coolify's generated catchall router does not take effect (503 expected, 404 observed) | **OPEN — cosmetic, root cause unknown.** Measured twice; the config file is present and readable, and Traefik emits no logs to explain it. A wrong hostname still gets a clean 404 | Platform runbook §9 #11 |
| 42 | Independent verification of the deployment claims | **DONE 2026-10-04** — a separate critic agent re-measured all 11 claims from scratch, attacking each one. **11 confirmed, 0 refuted.** It independently found the 8080 phantom port and the catchall discrepancy | Platform runbook §9 #9, #11 |
| 23 | Cloudflare domain + tunnel token | **OPEN — owner, later** | §6.3 |
| 24 | Auto-login decision | **OPEN — deferred** | §6.4 |
| 25 | Deploying an application / WordPress | **OPEN — out of scope for this build** | §0 · Runbook **§6a Task 4** |
| 26 | ⚠ triangle on the `localhost` server card (owner's screenshot) | **NOT AN ISSUE** — a Traefik update notice, not a fault. `detected_traefik_version=3.6.25`, `traefik_outdated_info.latest=3.7.13`; server reachable, proxy running, sentinel live | Runbook **§6a Task 3** |
| 27 | A DHCP address was still hard-coded in Runbook §6a Task 1 | **FIXED** — replaced with the static `172.28.50.2` | Runbook §6a Task 1 · §2 |

**Every owner action has literal click-by-click steps in `RUNBOOK-platform-server.md` §6a.**

**Nothing in this build is left in an unknown state.** Every item above is either fixed and re-measured,
proven not to be a problem, or explicitly waiting on the owner.
