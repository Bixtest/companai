# Review — "Canonical Architecture: Windows 10 laptop + Coolify"

**Reviewed:** 2026-10-04 · **Reviewer:** Konsult
**Document:** `library/canonical-optimized-windows10-coolify-web-ai-architecture.md`

---

## Verdict

**Worth doing. The architecture is sound** — Coolify + Traefik + Cloudflare Tunnel on an Ubuntu VM
is a standard, well-documented shape, and it is the right one for a Plesk-like hosting experience on
this laptop. The document's **facts about this machine are accurate** — I checked them rather than
trusting them.

**One honest caveat.** "Flawless" needs a definition. This can be built *properly* — for hosting the
platform and WordPress for testers. It cannot be made *production-grade* on this host. See §5.

---

## 1. What I verified (measured on this machine, 2026-10-04)

| Claim in the document | Measured | Verdict |
|---|---|---|
| Windows 10 Pro 22H2 | Windows 10 Pro, build **19045** | ✅ correct |
| Hyper-V already enabled | `vmms` service **Running**; 2 internal switches; 0 VMs defined | ✅ correct |
| No `.wslconfig` | absent | ✅ correct |
| C: ~93.9 GB free | **91.9 GB** free (384.4 GB used) | ✅ close |
| RAM ~32 GB, ~21.7 GB available after cleanup | 31.89 GB total, **16.43 GB** free (Docker closed) | ⚠️ tighter than stated |
| Coolify catalog lists Hermes Agent | confirmed in Coolify's service catalog | ✅ correct |
| CF Tunnel "All Resources" = `http://localhost:80`, HTTPS redirect disabled | confirmed in Coolify docs, incl. the `TOO_MANY_REDIRECTS` warning | ✅ correct |

**Good news for our own platform.** `docker-compose.fullapp.yml` was written to sit behind an
*external* proxy — its own comment names "Dokploy, Caddy, nginx, Cloudflare Tunnel", and its bundled
Traefik is in a **separate optional file**. So the platform is already Coolify-ready: deploy the base
compose, **do not** add `docker-compose.fullapp.traefik.yml`, and let Coolify's Traefik route to the
`app` service on port 3000.

---

## 2. The one real inconsistency — the AI stack will not fit in the VM

The document puts Coolify **and** the AI stack (Hermes + llama-server) inside a VM capped at **10 GB**.

But our platform's own `model` service needs **~10 GB by itself** (4.4 GB GGUF + a 64K KV cache;
measured: the model container held **~10 GiB** of the Docker VM's 15.56 GiB). Add Coolify, Traefik,
cloudflared, two WordPress sites and two MariaDBs and the VM wants ~13–14 GB — past the cap.

Raising the cap does not work either. The host budget:

```
Windows in use                ~10.2 GB
Docker Desktop / WSL2         up to ~15.5 GB   (the model alone held ~10 GiB)
Coolify VM (at the 10 GB cap) ~10.0 GB
                              --------
                              ~35.7 GB   vs   31.9 GB installed
```

**So the model server cannot live in the Coolify VM.** Pick one:

- **(a)** keep the model on the **dev** side (Docker Desktop) and point the deployed platform at it —
  simplest, but couples hosting to the dev environment;
- **(b)** run a **much smaller model** (1.5B, ~1 GB) in the VM — fits, but it is not the 7B;
- **(c)** point the deployed platform at an **external API** — most reliable, costs money.

---

## 3. The GPU is not available to the VM at all

§31/§32 treat the Quadro M2000M as an "optional experiment". It is — but not where the document
implies. **A Hyper-V Linux VM on Windows 10 client cannot use the NVIDIA GPU**: GPU-P is for Windows
guests, and Discrete Device Assignment needs server-class hardware. The GPU is therefore only ever
reachable from the **dev** side (Docker Desktop/WSL2) — and even there Maxwell is not officially
supported in WSL2 (the document's own source says so).

**Net effect: the Coolify VM is CPU-only, permanently.** That reinforces §2.

---

## 4. Gaps (omissions, not errors)

1. **Off-device backup is named but not specified.** "A second copy should exist outside the laptop" —
   but for a host whose whole purpose is being the host, losing the laptop loses everything. Needs a
   concrete mechanism *and a tested restore*.
2. **Windows Update will reboot the laptop.** Windows 10 Pro can defer but not prevent. Auto-start
   recovers in minutes — but it *is* downtime, and the document does not mention it.
3. **No monitoring or alerting.** If a site falls over at 03:00, nobody knows until a tester
   complains. Every check listed is manual.
4. **No comparison with a small VPS.** ~€5/month buys 24/7 uptime, no laptop dependency and a
   supported OS. Self-hosting is a legitimate choice (cost, control, data locality) — but the
   trade-off is never stated, and the owner should see it.
5. **The storage gate is not met yet.** The document's own rule says free space *before* creating the
   VM when C: < 100 GB. C: has 91.9 GB. Note also that the **4.9 GB codebase backup** taken today
   sits on C: and counts against this — it should move to E:.

---

## 5. What "flawless" can and cannot mean here

**Can be flawless:** the *configuration*. Every load-bearing piece is standard and documented, and the
steps are reproducible. Done carefully it will work and keep working.

**Cannot be flawless:** the *availability*. One laptop, one SSD, one power supply, on a home
connection, running an OS that went out of support on **14 October 2025** — a year ago. The document
says this itself (§41). That is fine for **testers and demos**. It is not fine for anything a paying
customer depends on.

So: **build it, and describe it to testers as a test environment — not production.** The document's
own phrase, "temporary infrastructure", is the honest one.

---

## 6. Suggested order

1. Move the backup zip to E:; free C: to **≥ 100 GB**.
2. Build the VM + Coolify; prove **one** WordPress site end-to-end through Cloudflare.
3. Decide §2 (where the model lives) **before** deploying the platform — it changes the VM size.
4. Deploy the platform's base compose (no bundled Traefik).
5. Add off-device backup **with a restore test**, then monitoring.

---

# Addendum — v2 (`canonical-architecture-v2-hybrid-ai-coolify.md`), checked 2026-10-04

## Verdict: yes, v2 solves the AI issue — both halves of it.

| Issue raised in §2/§3 above | v2's answer | Solved? |
|---|---|---|
| The ~10 GB model cannot fit in a 6–10 GB VM alongside Coolify/WordPress/DBs | Moves `llama-server` out of the VM onto **Windows (Docker Desktop/WSL2)**; VM drops to **3–6 GB** | ✅ yes |
| A Hyper-V Linux VM on Win10 client is **CPU-only, permanently** | States the VM has **no GPU dependency**; GPU is an optional Windows-side experiment | ✅ yes |

It also adds three things the first document lacked, and they are the right additions:

- **A private transport** for the VM→model link (Hyper-V Internal switch `AI-Private`, 172.28.50.0/24)
  instead of exposing the model publicly. Good.
- **Explicit caps on both sides** (WSL 12 GB / 4 CPU; VM 3–6 GB / 2 vCPU) and the correct statement
  that Hyper-V Dynamic Memory and WSL memory are *independent* managers, not one elastic pool.
- **AI health/retry/unavailable handling**, so a missing model does not take the website down.

The envelope now balances: `10.2 + 12 + 6 = 28.2 GB` of 31.9 GB.

## 1. The one thing v2 misses — and it is specific to *our* platform

v2 treats Hermes as a standalone Coolify service. **Ours is not.** `hermes` and `model` are both
services *inside* `docker-compose.fullapp.yml`, and the platform reaches the model through
`.env`:

```
OPENAI_BASE_URL=http://model:8080/v1        # ← must change
OM_AI_MODEL=Qwen2.5-7B-Instruct-Q4_K_M      # ← must match whatever Windows loads
```

So deploying the platform under v2 is **not** just "point Coolify at the repo". The compose must be
changed to:

1. **remove (or disable) the `model` service** — the model now lives on Windows;
2. repoint `OPENAI_BASE_URL` at the private host IP, e.g. `http://172.28.50.1:8080/v1`;
3. re-point Hermes' own `providers.mercato-local.baseUrl` at the same address;
4. keep `OM_AI_MODEL` in step with the model actually loaded on the Windows side.

v2 does not mention any of this. It is the concrete work needed to make v2 real.

## 2. Risks that remain in v2

1. **The VM→model link is an untested assumption.** Whether Docker Desktop will bind a published
   port to a Hyper-V *internal-switch* IP (`172.28.50.1:8080:8080`) is the linchpin of the whole
   design. v2 flags this honestly ("must be tested during commissioning"), but everything else
   depends on it. Also note an **ordering trap**: the `AI-Private` switch must exist *before*
   Docker Desktop starts, or the bind fails.
2. **The AI feature now depends on Docker Desktop — which depends on a signed-in user session.**
   Docker Desktop is a per-user app. After a reboot with nobody logged in, the model is *not* up,
   so the AI feature (the point of the platform) is down. v2 mentions the "start when you sign in"
   setting but not the login requirement. Making it 24/7 needs **Windows auto-login** — a real
   security trade-off that should be a conscious decision.
3. **The 12 GB WSL cap is tight.** The model is ~10 GB; that leaves ~2 GB for dockerd, containerd,
   buildkit and any dev containers. Two easy fixes v2 does not mention: **quantise the KV cache**
   (`--cache-type-k q8_0 --cache-type-v q8_0` ≈ halves ~3.7 GB of cache to ~1.8 GB), or raise the
   cap to 14 GB. Also consider `--no-mmap` so `autoMemoryReclaim` cannot page the weights back out.
4. **The envelope assumes an *idle* Windows.** 10.2 GB is the "everything closed" baseline. With a
   browser and an IDE open it is nearer 14–18 GB, and `16 + 12 + 6 = 34 GB` exceeds 31.9 GB. It is
   workable, but it is not as comfortable as the table implies.
5. **Storage arithmetic is not done, and the numbers are stale.** C: is **92 GB** free (v2 says
   93.9). A fully-grown 32 GB VHDX plus the model in WSL storage lands around **55–60 GB free** —
   inside v2's own "warning" band. Moving the 4.9 GB backup zip to E: is the cheapest fix.
6. **Still missing (carried over from §4):** a concrete off-device backup mechanism *and a tested
   restore*; monitoring/alerting; and any comparison against a ~€5/month VPS. The EOL point is
   also softer in v2 — it keeps "temporary" but drops the 14 Oct 2025 date, which is the reason.

## 3. Bottom line

**v2 is the right correction and should replace v1.** It answers both AI problems properly. Before
building, settle three things: (a) the compose edits in §1, (b) whether the laptop auto-logs-in
(§2.2), and (c) the WSL cap vs KV quantisation (§2.3). Everything else is commissioning detail.

