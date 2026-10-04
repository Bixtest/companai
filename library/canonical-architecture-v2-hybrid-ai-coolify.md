# Canonical Architecture v2 — Windows 10 Host + Coolify Web Platform + Windows AI Compute

**Engineering revision:** 2026-10-04  
**Status:** Corrected after resource-budget review.  
**Primary constraint:** Windows 10 Pro remains the everyday laptop OS and the machine runs the hosted stack 24/7 when powered.

## Executive decision

The previous architecture had one important flaw: it placed the heavy local model service inside the Coolify Hyper-V Linux VM. The platform's actual model workload is estimated at about **10 GB RAM on its own** for the selected test configuration (approximately 4.4 GB model plus the 64K context/cache/runtime footprint). That is incompatible with a small 6–10 GB server VM once Coolify, Traefik, WordPress, databases and Hermes are included.

The corrected architecture is:

```text
                                INTERNET
                                    |
                               CLOUDFLARE
                                    |
                           Cloudflare Tunnel
                                    |
                                    v
+------------------------------------------------------------------+
|                       WINDOWS 10 PRO LAPTOP                      |
|                                                                  |
|  +----------------------------+   +-----------------------------+ |
|  | Docker Desktop / WSL2     |   | Hyper-V                     | |
|  | DEVELOPMENT + AI COMPUTE |   | Ubuntu Server 24.04 LTS      | |
|  |                            |   |      |                       | |
|  | llama-server               |   |    Docker                    | |
|  | small local model          |   |      |                       | |
|  | dev/test containers        |   |   Coolify                    | |
|  |                            |   |      +-- Traefik              | |
|  +-------------+--------------+   |      +-- WordPress 1/2        | |
|                |                  |      +-- DBs                   | |
|                |                  |      +-- Platform API/workers | |
|                |                  |      +-- Hermes                | |
|                |                  +-------------------------------+ |
|                |                                  ^                |
|                +------ AI-Private network --------+                |
|                                                                  |
+------------------------------------------------------------------+
```

### Component decisions

| Function | Choice |
|---|---|
| Host OS | Windows 10 Pro 22H2 — temporary |
| Hypervisor | Hyper-V |
| Server OS | Ubuntu Server 24.04 LTS |
| Server runtime | Docker Engine |
| Hosting/control plane | Coolify |
| Reverse proxy | Coolify-managed Traefik |
| Public ingress | Cloudflare Tunnel |
| Development Docker | Existing Docker Desktop / WSL2 |
| Model server | Windows-side Docker Desktop / WSL2 |
| Model | Small local model, CPU-first |
| AI orchestration | Hermes in Coolify VM |
| VM↔AI transport | Dedicated private Hyper-V Internal switch |
| phpMyAdmin | Optional/private |
| CasaOS | Do not install |
| Nginx Proxy Manager | Do not install |
| Plesk | Do not install |
| Router port forwarding | Do not use |
| Public model endpoint | Do not expose |

## 1. Why the model must be outside the VM

The model is an application-specific workload requirement, not a generic Llama requirement. For this platform the supplied estimate is roughly:

```text
Model file                 ~4.4 GB
64K context/cache/runtime  additional memory
----------------------------------------------
Model service               ~10 GB total
```

A VM containing:

```text
Ubuntu
Docker
Coolify
Traefik
cloudflared
1–2 WordPress sites
1–2 databases
Hermes
model service
```

would exceed the safe memory envelope of the 32 GB laptop.

Therefore the **model/inference compute is deliberately hosted by Docker Desktop/WSL2 on Windows**.

This corrects the earlier document's placement of AI services inside the server VM. fileciteturn2file0L28-L34

## 2. Hermes does not need to move with the model

Hermes can remain inside the Coolify VM as the AI orchestration layer.

Current Hermes documentation says Hermes requires at least a **64K context window** for tool-using agent workflows and supports custom/OpenAI-compatible model endpoints. It can therefore call the Windows-hosted `llama-server`.

Sources:

- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/getting-started/quickstart.md
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/integrations/providers.md

Hermes itself has much smaller resource requirements than the model; current Hermes Docker documentation gives approximately 1 GB minimum and 2–4 GB recommended for the main gateway, with browser automation being more memory-intensive.

Source:

- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/docker.md

So the split becomes:

```text
Coolify VM:
    platform
    Hermes
    websites
    databases

Windows / Docker Desktop:
    llama-server
    model weights
    inference cache/runtime
```

## 3. User request flow

An external request continues to work normally:

```text
User
  |
  | HTTPS
  v
Cloudflare
  |
  | Tunnel
  v
Coolify / Traefik
  |
  v
Platform API
  |
  v
Hermes / AI logic
  |
  | private VM↔Windows network
  v
Windows llama-server
  |
  v
small local model
  |
  v
Hermes / Platform API
  |
  v
User
```

The user never connects directly to the private model endpoint.

The platform should treat the AI service as a normal internal dependency with health/retry/fallback behavior.

## 4. Dedicated private AI network

Create a Hyper-V **Internal** switch named for example:

```text
AI-Private
```

Assign:

```text
Windows host:
    172.28.50.1/24

Linux VM:
    172.28.50.2/24
```

Do not assign a gateway to this AI interface.

The VM will have a second NIC:

```text
NIC 1:
    Default Switch
    -> Internet/outbound services

NIC 2:
    AI-Private
    -> Windows host AI API only
```

Microsoft documents Internal switches as allowing communication between the host and VMs while being separate from the external network.

Sources:

- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/virtual-switch
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/create-a-virtual-switch-for-hyper-v-virtual-machines

## 5. Publishing the Windows model securely

Docker supports binding a published port to a specific host IP:

```yaml
ports:
  - "172.28.50.1:8080:8080"
```

This is preferable to publishing the model port to all Windows interfaces.

Source:

- https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/

Then add a Windows Firewall rule that permits TCP 8080 only from:

```text
172.28.50.2
```

The exact Docker Desktop binding must be tested during commissioning. If binding directly to the internal-switch IP is not accepted by the local Docker Desktop/WSL networking path, use a broader Windows host binding but enforce the same source restriction with Windows Firewall.

## 6. No public AI exposure

Never put the raw model service behind Cloudflare:

```text
Internet -> llama-server    X
```

The desired path is:

```text
Internet
    -> Cloudflare
    -> public platform
    -> Hermes/API
    -> private model endpoint
```

Keep these private unless a deliberate future requirement says otherwise:

```text
llama-server
Hermes internal APIs
databases
phpMyAdmin
Redis
Qdrant
Docker socket
```

## 7. Correct memory architecture

The laptop has **31.9 GB usable RAM**.

The measured Windows-only baseline after closing most applications and running `wsl --shutdown` was approximately:

```text
Windows in use:   ~10.2 GB
Available:        ~21.7 GB
Cached:            ~7.7 GB
```

The earlier large `vmmem` Private Memory value should not be interpreted as the same amount of physical RAM.

### The problem with the previous design

If we allowed:

```text
Windows baseline:   ~10.2 GB
WSL/Docker:         up to ~15.5–16 GB
Coolify VM:         10 GB
```

the host could be overcommitted.

Microsoft's current WSL configuration documentation says the WSL2 VM's default `memory` value is **50% of Windows physical memory**, so on a 32 GB laptop an uncapped WSL environment can have a ceiling around 16 GB.

Source:

- https://learn.microsoft.com/en-us/windows/wsl/wsl-config

## 8. WSL/Docker Desktop resource policy

The Windows-side AI/development environment should have an explicit ceiling.

Initial `.wslconfig` target:

```ini
[wsl2]
memory=12GB
processors=4

[experimental]
autoMemoryReclaim=gradual
```

Microsoft documents `.wslconfig` controls for WSL2 memory/CPU and `autoMemoryReclaim`. Docker also recommends the WSL auto-reclaim capability to return unused cache to Windows.

Sources:

- https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- https://docs.docker.com/desktop/features/wsl/

### Why 12 GB

The model is estimated at ~10 GB itself.

That leaves roughly:

```text
~2 GB
```

for the WSL/Docker runtime and small supporting services.

If the actual measured model stack needs more, increase the cap only after observing host behavior.

## 9. Coolify VM resource policy

Because the model no longer lives in the VM, the server VM can be much smaller.

Initial Hyper-V Dynamic Memory:

```text
Startup RAM:    4 GB
Minimum RAM:    3 GB
Maximum RAM:    6 GB
Memory Buffer: 20%
vCPU:           2
```

This gives the approximate theoretical envelope:

```text
Windows baseline        ~10.2 GB
WSL maximum              12.0 GB
Hyper-V VM maximum        6.0 GB
---------------------------------
                         28.2 GB
```

leaving roughly 3.7 GB before Windows workload growth and virtualization overhead.

This is intentionally conservative.

Do not start with a 10–16 GB VM.

Increase to 7 GB only if real Coolify/web/DB/Hermes metrics prove 6 GB is insufficient.

Microsoft documents Dynamic Memory's Startup/Minimum/Maximum/Buffer model and supported Ubuntu guests with Dynamic Memory operations.

Sources:

- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/dynamic-memory
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v

## 10. Important: these are independent resource managers

Hyper-V Dynamic Memory and WSL memory management do not form one global elastic pool.

The correct approach is therefore:

```text
WSL:
    hard max 12 GB

Hyper-V VM:
    dynamic 3–6 GB

Windows:
    receives the remaining physical capacity
```

Do not assume the host can safely let both environments burst to their maximum plus an already-heavy Windows workload.

Maintain a practical host headroom target of several GB.

## 11. CPU policy

CPU:

```text
Intel Core i7-6820HQ
4 physical cores
8 logical processors
```

Initial limits:

```text
WSL:
    4 logical processors

Coolify VM:
    2 vCPU
```

The model may be CPU-intensive, so do not allocate all logical processors to WSL and all cores again to the VM.

Windows remains the priority.

If the server becomes CPU-bound, test 3 vCPU for the VM before making more aggressive changes.

## 12. GPU policy

The Hyper-V Linux VM should be treated as **CPU-only** on this Windows 10 Pro host.

Microsoft's current GPU virtualization guidance says DDA and GPU-P are not supported on desktop/client operating systems such as Windows 10/11 Pro in the documented configurations.

Sources:

- https://learn.microsoft.com/en-us/troubleshoot/windows-server/virtualization/troubleshoot-hyper-v-gpu-assignment-partitioning-passthrough-issues
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/gpu-partitioning
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/deploy/deploying-graphics-devices-using-dda

NVIDIA's current CUDA-on-WSL documentation also says Maxwell GPUs are not officially supported in WSL2, although they may still work in some cases.

Source:

- https://docs.nvidia.com/cuda/wsl-user-guide/

Docker Desktop's current Windows GPU documentation uses WSL2 GPU paravirtualization for NVIDIA Linux containers.

Source:

- https://docs.docker.com/desktop/features/gpu/

Therefore:

```text
Server VM GPU dependency:
    NONE

Docker Desktop GPU experiment:
    OPTIONAL

CPU inference:
    REQUIRED fallback
```

## 13. Model placement is deliberately portable

Today:

```text
Coolify -> Hermes -> Windows llama-server
```

Later:

```text
Coolify -> Hermes -> dedicated GPU server
```

The platform should store the model endpoint as configuration, for example:

```text
LLM_BASE_URL=http://172.28.50.1:8080/v1
```

The exact endpoint should match the deployed server.

Do not hard-code GPU hardware into the application.

## 14. Do not add LiteLLM immediately

Coolify currently provides LiteLLM and other AI services, but with one local test model it is unnecessary extra infrastructure.

Initial:

```text
Platform -> Hermes -> llama-server
```

Later, with multiple providers:

```text
Platform
   -> LiteLLM
       +-> local model
       +-> Ollama
       +-> external provider
       +-> dedicated GPU inference
```

Sources:

- https://coolify.io/docs/services/overview
- https://coolify.io/docs/services/litellm

## 15. Coolify remains the Plesk-like control plane

Coolify remains the right management interface for:

```text
domains
applications
Docker images
Docker Compose
databases
environment variables
storage
deployments
logs
metrics
resource limits
proxy
TLS
WordPress
AI services
```

Current documentation supports applications from Git, Docker images and Compose, plus multi-container Services.

Sources:

- https://coolify.io/docs/applications
- https://coolify.io/docs/services
- https://coolify.io/docs/core/networking/domains
- https://coolify.io/docs/core/networking/proxy/traefik/overview

Do not add Plesk, CasaOS or Nginx Proxy Manager.

## 16. WordPress

Deploy each site through Coolify's WordPress template:

```text
WordPress + MariaDB
```

or MySQL where required.

Coolify currently documents both variants and automatic DB configuration/health checks.

Source:

- https://coolify.io/docs/services/wordpress

For the expected scale:

```text
Site 1 -> WordPress + DB
Site 2 -> WordPress + DB
```

Start with one, validate, then add the second.

## 17. WordPress migration

Use:

```text
existing files
+
database dump
```

Create the WordPress resource, restore the database through Coolify's database workflow, restore persistent WordPress files, configure the domain and validate:

```text
wp-admin
media
permalinks
HTTPS
database connectivity
```

Coolify documents MySQL/MariaDB restore through its Import Backup workflow.

Source:

- https://coolify.io/docs/databases/restore

## 18. phpMyAdmin

Use the current Coolify phpMyAdmin service as a private database administration tool.

Source:

- https://coolify.io/docs/services/phpmyadmin

Useful for:

```text
SQL inspection
manual queries
migration troubleshooting
manual export/import
```

Do not expose it publicly.

## 19. Backups

Back up separately:

```text
WordPress databases
WordPress persistent files/uploads
Coolify recovery state
Hermes persistent data
application volumes
Compose/configuration
secrets/recovery material
```

Coolify currently documents database backup/restore and instance recovery requirements.

Sources:

- https://coolify.io/docs/databases/backups
- https://coolify.io/docs/databases/restore
- https://coolify.io/docs/core/backup-and-recovery/instance-backup

Use E: USB as an optional local secondary copy and keep another copy off the laptop.

E: is removable and must never be required for the live server.

## 20. C: storage policy

Current:

```text
C: ~93.9 GB free
```

The external E: drive is not a live-server disk.

Do not consume the C: drive down to a small remainder.

Practical guardrails:

```text
C: > 60 GB free
    healthy

C: 50–60 GB
    warning

C: < 50 GB
    stop server storage growth and remediate
```

The live Hyper-V VHDX is dynamically expanding.

Because the model also lives in WSL storage on C:, both the WSL/Docker data and the Hyper-V VHDX must be considered together.

## 21. Initial VM disk

Start conservatively:

```text
Dynamic VHDX
maximum ~32 GB
```

Expand later:

```text
32 GB -> 48 GB -> 64 GB
```

only after additional personal data has been moved off C: and the host free-space guardrail remains intact.

Do not place the live VM on E:.

## 22. Automatic recovery

Hyper-V VM:

```text
Automatic Start:
    Always start

Startup delay:
    30–60 seconds

Automatic Stop:
    Shut down
```

Microsoft documents Hyper-V automatic start/stop actions.

Source:

- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology

Emergency:

```powershell
Get-VM
Start-VM -Name "Platform-Server"
```

Source:

- https://learn.microsoft.com/en-us/powershell/module/hyper-v/start-vm

The application must tolerate AI startup lag after Windows reboot because Docker Desktop/WSL may come up after the Linux VM.

## 23. AI health/retry behavior

The public platform must not assume the local model is available during every instant of boot.

Implement:

```text
AI endpoint health check
retry/backoff
graceful unavailable state
optional fallback
```

Example:

```text
AI HEALTHY
    -> use model

AI STARTING
    -> retry

AI UNAVAILABLE
    -> graceful response/fallback
```

The website itself should continue to serve basic pages even if local inference is temporarily unavailable.

## 24. Docker Desktop startup consideration

Current Docker Desktop supports a “Start Docker Desktop when you sign in” setting.

Source:

- https://docs.docker.com/desktop/settings-and-maintenance/settings/

Docker also documents an all-users installation mode and its privileged `com.docker.service` behavior.

Sources:

- https://docs.docker.com/desktop/setup/install/windows-install/
- https://docs.docker.com/desktop/setup/install/windows-permission-requirements/

Therefore:

> The public website platform must not depend on Docker Desktop being available.

The AI feature is allowed to be temporarily unavailable after a Windows reboot until the AI subsystem starts.

Once the server is stable, decide whether the Docker Desktop setup should be configured to start automatically for the desired 24/7 AI behavior.

## 25. Development policy

Existing Docker Desktop remains:

```text
DEVELOPMENT / TEST
```

Use it for:

```text
coding
local builds
experimental Compose
AI experiments
temporary containers
debugging
```

Use the Coolify VM for:

```text
hosted websites
hosted platform API
hosted workers/services
hosted databases
Hermes
public application services
```

## 26. Security model

Public:

```text
Cloudflare
    ->
Cloudflare Tunnel
    ->
Coolify/Traefik
    ->
intended public applications
```

Private:

```text
AI-Private network
databases
phpMyAdmin
Coolify administration
llama-server
Hermes internals
Redis
Qdrant
Docker socket
```

No router forwarding for:

```text
80
443
22
3306
5432
8080
```

## 27. Final resource envelope

```text
PHYSICAL HOST
================================================
RAM:                 31.9 GB

Measured Windows baseline:
                     ~10.2 GB

WSL / Docker Desktop
================================================
RAM max:              12 GB
CPU max:               4 logical processors
autoMemoryReclaim:     gradual

Purpose:
    model + development

HYPER-V COOLIFY VM
================================================
Startup RAM:            4 GB
Minimum RAM:            3 GB
Maximum RAM:            6 GB
Memory Buffer:         20%
vCPU:                   2

Purpose:
    web + platform + DB + Hermes

Approximate maximum envelope:
    10.2 + 12 + 6 = 28.2 GB
```

This deliberately leaves host headroom.

## 28. Final network diagram

```text
                                         INTERNET
                                             |
                                             v
                                       CLOUDFLARE
                                             |
                                       Tunnel/HTTPS
                                             |
                                             v
+----------------------------------------------------------------------------+
|                              WINDOWS 10 PRO                                |
|                                                                            |
|  +----------------------------+       +--------------------------------+ |
|  | Docker Desktop / WSL2     |       | Hyper-V                         | |
|  |                            |       |                                | |
|  | AI COMPUTE                 |       | Ubuntu Server                   | |
|  |                            |       |       |                        | |
|  | llama-server               |<------|-------| AI-Private 172.28.50.x  | |
|  | 4.4 GB model              |       |       |                        | |
|  | 64K context/cache          |       |     Docker                       | |
|  |                            |       |       |                        | |
|  | Development/testing        |       |     Coolify                     | |
|  +----------------------------+       |       |                        | |
|                                       |   Traefik                       | |
|                                       |       |                        | |
|                                       |  +----+----------------------+   | |
|                                       |  |                           |   | |
|                                       | WEB / PLATFORM / AI CONTROL |   | |
|                                       |  |                           |   | |
|                                       | WP1 WP2 API workers Hermes  |   | |
|                                       | DBs                        |   | |
|                                       +-------------------------------+   | |
|                                                                            |
+----------------------------------------------------------------------------+
```

## 29. Alternatives checked

### Coolify — SELECTED

Best fit because it combines Docker/Compose deployments, domains, proxy/TLS, databases, WordPress, resource controls, Cloudflare Tunnel and a growing AI service catalog.

Sources:

- https://coolify.io/docs/
- https://coolify.io/docs/services/overview

### Dokploy — not selected

Strong Docker PaaS competitor, but its current repository includes separately licensed proprietary material.

### Cosmos — not selected

Very capable home-server/security platform, but current licensing combines Apache 2.0 with Commons Clause and its product model is less aligned with this deployment-oriented platform.

### Runtipi — not selected

Good open-source homeserver platform, but less aligned with the PaaS/deployment model.

### Umbrel — not selected

Polished homeserver appliance but not the preferred open-source licensing model for this project.

### CapRover — not selected

Valid Docker PaaS, but Coolify better matches the combined WordPress + AI + Cloudflare + database requirements.

## 30. Final implementation sequence

### Phase 1 — finish host storage cleanup

- Finish moving personal data from C: to E:/other storage.
- Re-check C: free space.
- Keep the C: reserve intact.
- Do not create the VM during the large copy.

### Phase 2 — Hyper-V

- Create `Platform-Server`, Generation 2.
- Configure Dynamic Memory:
  - 3 GB minimum
  - 4 GB startup
  - 6 GB maximum
  - 20% buffer
- Configure 2 vCPU.
- Attach Default Switch.
- Create the `AI-Private` internal switch.
- Add the second VM NIC.

### Phase 3 — Ubuntu + Docker + Coolify

- Install Ubuntu Server 24.04 LTS.
- Install OpenSSH.
- Install Coolify using the current official installation path.
- Secure admin access and enable 2FA.
- Verify Traefik.

### Phase 4 — private AI network

- Assign Windows `172.28.50.1/24`.
- Assign VM `172.28.50.2/24`.
- Publish `llama-server` to the private host IP where Docker Desktop permits it.
- Add Windows Firewall restriction to VM source.
- Test VM -> Windows AI endpoint.

### Phase 5 — Cloudflare

- Configure DNS through Cloudflare.
- Create one Tunnel.
- Follow Coolify's current All Resources Tunnel method.
- Route to the Coolify proxy.
- Keep AI endpoint outside Cloudflare.

### Phase 6 — first WordPress

- Deploy one WordPress + MariaDB.
- Configure the domain.
- Restore database.
- Restore WordPress files.
- Test HTTPS/wp-admin/uploads/permalinks.
- Test backup and restore.

### Phase 7 — Hermes and AI

- Deploy Hermes in Coolify.
- Configure its model endpoint to the Windows private IP.
- Run the small Llama model in Docker Desktop/WSL2.
- Validate 64K context.
- Measure RAM/CPU/latency/tokens per second.
- Add resource limits after measurement.

### Phase 8 — second site / additional stacks

Add another WordPress site or Docker stack only after observing the real resource profile.

## 31. Acceptance tests

The system is ready when:

```text
Windows:
    remains responsive

VM:
    starts automatically after reboot

Docker:
    services restart

Coolify:
    dashboard and proxy work

Cloudflare:
    public HTTPS works with no router forwarding

WordPress:
    login/media/permalinks work

Database:
    backup and restore work

AI:
    llama-server works
    64K context works
    Hermes connects
    platform can call AI privately

Failure:
    temporary AI unavailability does not take the website down
```

## 32. Final verdict

The corrected architecture is:

```text
Windows 10 Pro
    |
    +-- Docker Desktop / WSL2
    |      |
    |      +-- llama-server
    |      +-- small local model
    |      +-- development/testing
    |
    +-- Hyper-V
           |
           +-- Ubuntu Server 24.04
                  |
                  +-- Docker
                        |
                        +-- Coolify
                        |     +-- Traefik
                        |     +-- WordPress
                        |     +-- DBs
                        |     +-- Platform API/workers
                        |     +-- Hermes
                        |
                        +-- cloudflared
                        |
                        +-- AI-Private NIC
                               |
                               v
                         Windows llama-server
```

### The key architectural principle

> **Keep the heavy inference engine/model on the Windows side, keep the web/application/AI-orchestration platform in the Linux VM, and connect the two through a private host↔VM network.**

This removes the model-memory conflict, avoids unsupported Hyper-V Linux GPU assumptions, preserves the Plesk-like Coolify experience, keeps the existing Docker Desktop workflow useful, and makes eventual migration to a dedicated GPU server straightforward.

### Validation sources

Coolify:
- https://coolify.io/docs/start-with-self-hosted
- https://coolify.io/docs/applications
- https://coolify.io/docs/services
- https://coolify.io/docs/services/overview
- https://coolify.io/docs/services/wordpress
- https://coolify.io/docs/services/phpmyadmin
- https://coolify.io/docs/core/networking/domains
- https://coolify.io/docs/core/networking/proxy/traefik/overview
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource
- https://coolify.io/docs/databases/restore
- https://coolify.io/docs/databases/backups
- https://coolify.io/docs/applications/configuration/resource-limits
- https://coolify.io/docs/core/security-model

Microsoft / Hyper-V:
- https://learn.microsoft.com/en-us/windows/server/virtualization/hyper-v/virtual-switch
- https://learn.microsoft.com/en-us/virtualization/hyper-v-on-windows/user-guide/setup-nat-network
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/dynamic-memory
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v
- https://learn.microsoft.com/en-us/troubleshoot/windows-server/virtualization/troubleshoot-hyper-v-gpu-assignment-partitioning-passthrough-issues
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/gpu-partitioning
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/deploy/deploying-graphics-devices-using-dda
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology
- https://learn.microsoft.com/en-us/powershell/module/hyper-v/start-vm

Docker / WSL:
- https://docs.docker.com/desktop/features/wsl/
- https://docs.docker.com/desktop/features/gpu/
- https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- https://docs.docker.com/desktop/settings-and-maintenance/settings/
- https://learn.microsoft.com/en-us/windows/wsl/wsl-config

NVIDIA:
- https://docs.nvidia.com/cuda/wsl-user-guide/

Hermes:
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/getting-started/quickstart.md
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/integrations/providers.md
- https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/docker.md

llama.cpp:
- https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md

This document supersedes the earlier canonical document specifically by moving the heavy local model out of the Coolify VM. The previous document otherwise remains the historical baseline for the architecture review. fileciteturn2file0L8-L34
