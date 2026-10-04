# Canonical Architecture — Windows 10 Everyday Laptop + Coolify Web Platform + Local AI Lab

**Engineering revision:** 2026-10-04  
**Purpose:** Final, fact-checked architecture for a Windows 10 Pro laptop that remains an everyday personal computer while temporarily hosting websites, arbitrary Docker applications, and a small local AI stack for testing.

---

## 0. Executive decision

The recommended platform is:

```text
Windows 10 Pro 22H2
        |
        +-- Docker Desktop / WSL2
        |      |
        |      +-- DEVELOPMENT / TESTING ONLY
        |             +-- experimental containers
        |             +-- local AI experiments
        |             +-- temporary Compose stacks
        |
        +-- Hyper-V
               |
               +-- Ubuntu Server 24.04 LTS VM
                      |
                      +-- Docker Engine
                             |
                             +-- Coolify
                             |     |
                             |     +-- Traefik proxy
                             |     +-- WordPress sites
                             |     +-- databases
                             |     +-- arbitrary Docker/Compose apps
                             |     +-- AI services
                             |
                             +-- cloudflared
                                    |
                                    v
                               Cloudflare
                                    |
                                    v
                                INTERNET
```

### Final component decisions

| Function | Choice | Decision |
|---|---|---|
| Windows host | Windows 10 Pro 22H2 | Keep temporarily |
| Hypervisor | **Hyper-V** | **Use** |
| Linux server | **Ubuntu Server 24.04 LTS** | **Use** |
| Container runtime | **Docker Engine inside VM** | **Use** |
| Hosting/control plane | **Coolify** | **Use** |
| Reverse proxy | **Coolify-managed Traefik** | **Use** |
| Public ingress | **Cloudflare Tunnel** | **Use** |
| WordPress | Coolify WordPress service | **Use** |
| DB | MariaDB or MySQL | **Use** |
| DB UI | phpMyAdmin, private | **Optional** |
| Development Docker | Existing Docker Desktop/WSL2 | **Keep** |
| AI agent | Hermes Agent | **Use when needed** |
| Small local LLM | llama.cpp/llama-server or selected runtime | **CPU-first** |
| GPU | Quadro M2000M | **Optional experiment, not dependency** |
| CasaOS | — | **Do not install** |
| Nginx Proxy Manager | — | **Do not install** |
| Plesk | — | **Do not install** |
| Router port forwarding | — | **Do not use** |
| Public DB/SSH ports | — | **Do not expose** |

This is intentionally a **single control plane per responsibility**:

```text
Cloudflare        = public edge
Cloudflare Tunnel  = public connectivity
Coolify            = deployment/control plane
Traefik            = reverse proxy
Docker             = runtime
Compose/Git        = application definition
llama-server       = initial model API
```

---

# 1. Why this architecture is the best fit for this laptop

The laptop is doing two jobs:

1. It remains the user's normal Windows computer.
2. It temporarily hosts a small self-hosted platform.

The architecture therefore needs **isolation without waste**.

The earlier design used:

```text
Linux
 -> Docker
   -> CasaOS
      -> Nginx Proxy Manager
         -> applications
```

That works, but it creates overlapping management layers.

The optimized design removes the duplicated management/proxy layers:

```text
Linux
 -> Docker
   -> Coolify
      -> Traefik
         -> applications
```

Coolify currently supports Linux VMs, Docker applications, Docker Compose, databases, domains, a built-in Traefik proxy, WordPress, backups, resource limits, and Cloudflare Tunnel integration. Its current service catalog also includes Hermes Agent, Ollama, LiteLLM, Qdrant, Langfuse and other AI infrastructure.

Sources:
- https://coolify.io/docs/start-with-self-hosted
- https://coolify.io/docs/applications
- https://coolify.io/docs/services
- https://coolify.io/docs/core/networking/proxy/traefik/overview
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels
- https://coolify.io/docs/services/overview

Coolify's main repository is currently Apache License 2.0:
- https://github.com/coollabsio/coolify/blob/main/LICENSE

---

# 2. Hardware facts established from the laptop

From the supplied Windows screenshots and PowerShell output:

```text
CPU:
    Intel Core i7-6820HQ
    4 physical cores
    8 logical processors
    Base clock ~2.70 GHz

RAM:
    32 GB installed
    2133 MHz
    31.9 GB visible to Windows

Storage:
    C: SSD
        ~93.9 GB free at the time measured
        ~382.4 GB used

    E: USB
        ~70.1 GB free
        ~861.4 GB used
        external/removable

GPU:
    Intel HD Graphics 530
    NVIDIA Quadro M2000M

Virtualization:
    Hyper-V enabled
    VirtualMachinePlatform enabled

WSL:
    WSL 2.7.10.0
    Kernel 6.18.33.2-2
    docker-desktop distribution
    WSL2

Windows:
    Windows 10 Pro 22H2
    OS build 19045
```

The laptop is therefore sufficient for the proposed **temporary** platform, but the CPU is modest and the physical C: drive requires disciplined storage management.

---

# 3. Memory baseline and interpretation

After closing most applications and running:

```powershell
wsl --shutdown
```

the machine showed approximately:

```text
RAM installed:       32.0 GB
Windows in use:      ~10.2 GB
Available:            ~21.7 GB
Cached:                ~7.7 GB
```

This is a much healthier baseline than the earlier ~24 GB in-use snapshot.

The earlier `vmmem` result with a large Private Memory value should not be read as an equal amount of physical RAM being consumed. The more useful sanity check is the system's physical-memory view and the working set.

Docker's current WSL2 documentation explains that the backend uses dynamic allocation and recommends WSL `autoMemoryReclaim` so Windows can reclaim unused Linux page cache.

Source:
- https://docs.docker.com/desktop/features/wsl/

### Do not kill these to make the percentage look better

Do not terminate:

- Memory Compression;
- Microsoft Defender/Antimalware Service Executable;
- Windows Search;
- Desktop Window Manager;
- core Windows services.

The easy workload-level wins are:

- unnecessary Chrome tabs/processes;
- WorkBuddy when not needed;
- idle Docker Desktop containers;
- unnecessarily large AI model/context/concurrency.

---

# 4. Hyper-V is the preferred hypervisor

The host is Windows 10 Pro 22H2 and Hyper-V is already enabled.

Microsoft explicitly supports Hyper-V on Windows 10 Pro and Enterprise.

Sources:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/host-hardware-requirements

Therefore:

> **Use Hyper-V. Do not install VirtualBox for this project.**

This also avoids introducing a second general-purpose hypervisor onto the laptop.

---

# 5. Hyper-V networking

The current switches are:

```text
Default Switch     Internal
WSL                Internal
```

Use the existing:

```text
Default Switch
```

for the Linux server VM initially.

Hyper-V supports NAT networking through internal virtual switches, and the Windows Default Switch is designed to provide VM connectivity without putting the VM directly on the physical LAN.

Source:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network

Do **not** create an external/bridged switch merely to expose the websites.

The websites will be exposed through Cloudflare Tunnel:

```text
Internet
    |
Cloudflare
    |
Cloudflare Tunnel
    |
Linux VM
```

not:

```text
Internet
    |
Router port forward
    |
Windows host
    |
Linux VM
```

The existing Default Switch is also sufficient for outbound Internet access required by APT, Docker image pulls, Coolify and Cloudflare.

---

# 6. Hyper-V Dynamic Memory

This is one of the most important optimizations for this dual-use laptop.

Hyper-V Dynamic Memory exposes:

```text
Startup RAM
Minimum RAM
Maximum RAM
Memory Buffer
```

and adjusts the memory assigned to the VM according to demand.

Microsoft explicitly documents Dynamic Memory on Windows 10 and supported Ubuntu guests, including Dynamic Memory hot-add and ballooning.

Sources:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/dynamic-memory
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v

### Why this is ideal here

Normal Windows workload:

```text
Windows busy
    -> VM can remain near its minimum
```

Server/AI workload increases:

```text
VM needs more
    -> Hyper-V can grow the VM allocation
```

Windows becomes busy again:

```text
VM demand falls
    -> Hyper-V can reclaim unused VM memory
```

Dynamic Memory does not create memory; it only manages the physical 32 GB more efficiently.

---

# 7. Exact initial VM memory settings

Start with:

```text
Startup RAM:      4096 MB
Minimum RAM:      4096 MB
Maximum RAM:     10240 MB
Memory Buffer:       20%
```

### Why 4 GB minimum

The VM contains more than an empty Ubuntu installation:

```text
Ubuntu
Docker
Coolify
Traefik
cloudflared
Databases
Applications
```

A 4 GB floor gives the server a dependable operating baseline.

### Why 10 GB maximum

The host has 32 GB and remains the primary desktop.

Ten GB gives the server meaningful headroom without allowing it to crowd the Windows workload unnecessarily.

Increase to 12 GB only after metrics demonstrate the need.

### Memory Buffer

20% is a sensible starting point. Hyper-V documents the buffer as the percentage of the guest's current memory need that it tries to keep as additional headroom.

Source:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/dynamic-memory

---

# 8. CPU allocation

The CPU has:

```text
4 physical cores
8 logical processors
```

Start with:

```text
2 vCPU
```

Do not allocate all 4 cores to the server VM.

Keep CPU available for:

- Windows;
- browser;
- IDE;
- WorkBuddy;
- Docker Desktop/WSL2;
- occasional local AI testing.

If the server is demonstrably CPU-bound, move to:

```text
3 vCPU
```

before considering more aggressive changes.

---

# 9. WSL / Docker Desktop resource policy

Your existing Docker Desktop should remain the development/test environment.

Docker documents WSL2 resource use and recommends `autoMemoryReclaim` where available.

Source:
- https://docs.docker.com/desktop/features/wsl/

Your WSL configuration currently has no `.wslconfig`.

### Recommended first WSL change after the server is stable

Create:

```text
%UserProfile%\.wslconfig
```

with:

```ini
[experimental]
autoMemoryReclaim=gradual
```

Then:

```powershell
wsl --shutdown
```

and restart Docker Desktop when you next need it.

### Do NOT impose a hard WSL memory cap yet

Do not initially set:

```ini
[wsl2]
memory=4GB
```

because Docker Desktop is your development/AI laboratory and may genuinely need more memory.

Only introduce a hard cap after observing real contention.

---

# 10. Docker Desktop policy

When actively developing:

```text
Docker Desktop       ON
Coolify VM            ON
Windows               normal
```

When not developing:

```text
Docker Desktop       idle/off
Coolify VM            ON
Windows               normal
```

Docker documents its Resource Saver behavior, but with WSL2 the shared WSL VM can remain present; `autoMemoryReclaim` is therefore the important reclaim mechanism.

Source:
- https://docs.docker.com/desktop/use-desktop/resource-saver/
- https://docs.docker.com/desktop/features/wsl/

---

# 11. Linux OS

Use:

```text
Ubuntu Server 24.04 LTS
```

Coolify currently documents Ubuntu LTS releases including 24.04 and explicitly supports installation on Linux VMs.

Source:
- https://coolify.io/docs/start-with-self-hosted

Use a fresh VM.

Install:

- OpenSSH server;
- normal server utilities.

Do not install:

- Ubuntu Desktop;
- Docker Desktop;
- CasaOS;
- Nginx Proxy Manager.

---

# 12. VM generation and storage

Create a:

```text
Generation 2
```

VM.

Use a dynamically expanding VHDX on the **internal C: SSD**.

Do not use the removable E: drive for the live VM.

### Storage rule based on your current C: capacity

Current:

```text
C: ~93.9 GB free
```

Finish your current large file-transfer/cleanup operation before creating the VM.

Then use this decision tree:

```text
C: free >= 120 GB
    -> dynamic VHDX maximum 64 GB

C: free 100–119 GB
    -> dynamic VHDX maximum 48 GB

C: free < 100 GB
    -> free more space first
```

The VHDX is dynamically expanding, so the maximum is not immediately allocated physically.

### Host free-space guardrail

Keep at least:

```text
50 GB free on C:
```

Do not allow the VM's actual growth to consume the Windows safety margin.

---

# 13. Storage expansion later

As you move more files off C:, the VM can grow:

```text
48/64 GB
   -> 80 GB
   -> 100 GB
   -> 120 GB
```

only when actual usage justifies it and the physical SSD has a healthy reserve.

Hyper-V supports VHDX resizing.

Source:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v

Do not provision large virtual disks merely because they are available.

---

# 14. E: external USB storage

Current:

```text
E: ~70.1 GB free
```

It is removable and the laptop will sometimes be used without it.

Therefore E: is suitable for:

- secondary backups;
- archives;
- exported WordPress backups;
- offline copies.

It is not suitable for:

- live VM disk;
- live database;
- live Docker volume;
- anything required for website availability.

A second backup should also exist off the laptop, preferably in cloud/S3-compatible storage.

---

# 15. Host power / 24x7 operation

The laptop will run the server 24/7 while on AC.

Recommended on AC:

```text
Sleep:
    Disabled

Screen:
    Allowed to turn off

Lid:
    Do nothing if the laptop is intended to remain running closed
```

Keep ventilation unobstructed and use a ventilated/hard surface.

If Lenovo firmware/software supports a battery charging threshold, consider it for battery longevity.

---

# 16. Automatic VM startup after reboot

Configure the VM's Hyper-V automatic start action to:

```text
Always start this virtual machine automatically
```

Use a modest start delay such as:

```text
30–60 seconds
```

Set the automatic stop action to:

```text
Shut down the guest operating system
```

Hyper-V documents these automatic start/stop actions.

Source:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology

This gives the desired behavior:

```text
Windows boots
    |
Hyper-V service starts
    |
Ubuntu VM auto-starts
    |
Docker starts
    |
Coolify starts
    |
cloudflared reconnects
    |
websites return
```

### Manual emergency recovery

```powershell
Get-VM
Start-VM -Name "Platform-Server"
```

Source:
- https://learn.microsoft.com/en-us/powershell/module/hyper-v/start-vm

---

# 17. Coolify installation

Coolify requires only modest platform resources; its current documented minimum is 2 CPU cores, 2 GB RAM and 10 GB disk, but real workloads require more.

Source:
- https://coolify.io/docs/start-with-self-hosted

Install using the official path:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Do not install a second Docker Desktop or an unrelated Docker stack inside the VM.

Coolify's installer can handle Docker when appropriate.

Create the Coolify administrator account immediately after installation.

Coolify warns that the first person reaching the registration page can become the instance administrator.

Source:
- https://coolify.io/docs/start-with-self-hosted

---

# 18. Coolify security

Enable:

```text
Strong admin credential
2FA
Private management access
```

Keep the Coolify dashboard off the public application wildcard.

Coolify explicitly states that the host OS, Docker runtime and workloads remain the operator's security responsibility.

Source:
- https://coolify.io/docs/core/security-model

Store the Coolify `APP_KEY` outside the server as part of the recovery material.

Source:
- https://coolify.io/docs/core/backup-and-recovery/instance-backup

---

# 19. Reverse proxy

Use Coolify's built-in:

```text
Traefik
```

Coolify currently documents Traefik as the default integrated reverse proxy. It generates routing from domains and container ports.

Source:
- https://coolify.io/docs/core/networking/proxy/traefik/overview

Do not install Nginx Proxy Manager.

There is no benefit in having both manage the same routing layer.

---

# 20. Cloudflare Tunnel

Use:

```text
one Cloudflare Tunnel
```

for the Coolify environment.

Coolify explicitly recommends its **All Resources** Cloudflare Tunnel architecture for beginners and says it is appropriate for laptops without a public IP or where port forwarding is unavailable/undesirable.

Sources:
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource

Architecture:

```text
Internet
   |
Cloudflare
   |
Cloudflare Tunnel
   |
cloudflared
   |
Coolify Proxy
   |
Application
```

No router port forwarding is required.

---

# 21. Critical Cloudflare routing detail

For Coolify's documented All Resources tunnel configuration, the service URL is:

```text
http://localhost:80
```

This is a **validated Coolify-specific configuration**, not a generic Docker rule.

Source:
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource

Coolify's guide says this target lets the proxy route requests to all Coolify resources without creating a new internal target for every application.

### HTTPS behavior

For this mode:

```text
Visitor --HTTPS--> Cloudflare
Cloudflare --Tunnel--> Coolify over HTTP :80
```

Coolify's documentation specifically instructs you to disable its **Redirect HTTP to HTTPS** resource setting for this HTTP tunnel path, otherwise a redirect loop (`TOO_MANY_REDIRECTS`) can occur.

If origin-side HTTPS is required, use Coolify's Full TLS tunnel method instead.

Source:
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource

---

# 22. Domains

Coolify is the Plesk-like management layer for this architecture.

Typical deployment:

```text
Coolify
  -> Create resource
  -> Set domain
  -> Configure application
  -> Deploy
```

Examples:

```text
example.com
shop.example.com
api.example.com
anotherdomain.com
```

Coolify's domain system generates the corresponding Traefik route.

Source:
- https://coolify.io/docs/core/networking/domains

One Cloudflare tunnel can serve multiple domains; the appropriate apex and/or wildcard routes should be configured per domain/zone.

Source:
- https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource

---

# 23. WordPress deployment

Use Coolify's current WordPress service.

Documented variants:

```text
WordPress + MariaDB
WordPress + MySQL
```

Coolify describes the MariaDB variant as the preferred option for most users and includes automatic database configuration and health checks.

Source:
- https://coolify.io/docs/services/wordpress

For two sites:

```text
Site 1
  +-- WordPress
  +-- MariaDB 1

Site 2
  +-- WordPress
  +-- MariaDB 2
```

Keep database ports private.

---

# 24. WordPress migration

A migration can use:

```text
Existing WordPress backup
    |
    +-- WordPress files
    +-- database.sql / database dump
```

Coolify can restore MySQL/MariaDB backups through:

```text
Database
  -> Configuration
  -> Import Backup
```

Its current documentation supports MySQL and MariaDB restore-from-file workflows.

Source:
- https://coolify.io/docs/databases/restore

Recommended sequence:

```text
Create DB
   -> restore DB
   -> restore wp-content/files
   -> configure domain
   -> verify URL/HTTPS
   -> test wp-admin
   -> test uploads/permalinks
   -> backup restored site
```

Stop application writes during destructive restores and verify schema/engine compatibility before reconnecting the application.

Source:
- https://coolify.io/docs/databases/restore

---

# 25. phpMyAdmin

Coolify currently provides a phpMyAdmin service template.

Source:
- https://coolify.io/docs/services/phpmyadmin

Use it as:

```text
PRIVATE DATABASE ADMINISTRATION
```

for:

- table inspection;
- SQL queries;
- troubleshooting;
- manual import/export;
- migration checks.

Keep it private. Do not publish it on the normal public domain wildcard.

Routine database restoration should prefer Coolify's native restore workflow.

---

# 26. Database backups

Coolify currently supports database backup workflows for supported engines including MySQL and MariaDB.

Sources:
- https://coolify.io/docs/databases/backups
- https://coolify.io/docs/databases/operations/overview

For the WordPress sites:

```text
Daily database backup
        |
        +--> off-device copy
```

Persistent volumes are not backups.

A second copy should exist outside the laptop.

---

# 27. Coolify recovery

Protect the Coolify instance itself.

Coolify's current recovery documentation specifically requires preserving the `APP_KEY` with recovery material. A database backup alone does not contain the key required to decrypt encrypted credentials.

Sources:
- https://coolify.io/docs/core/backup-and-recovery/instance-backup
- https://coolify.io/docs/core/security-model

Separate recovery plans:

```text
PLATFORM RECOVERY
    Coolify database/configuration/secrets

WORKLOAD RECOVERY
    WordPress files/databases/application volumes
```

---

# 28. AI project architecture

The platform is not only WordPress hosting.

It also needs to support an AI-first application platform, including Hermes and a small local Llama model for testing.

Use logical separation inside Coolify:

```text
COOLIFY
|
+-- WEB
|    +-- WordPress 1
|    +-- WordPress 2
|
+-- PLATFORM
|    +-- frontend
|    +-- API
|    +-- workers
|    +-- DB
|
+-- AI
     +-- Hermes Agent
     +-- llama-server
     +-- optional vector DB later
```

Coolify's current service catalog includes Hermes Agent, Ollama, LiteLLM, Qdrant, Langfuse, Open WebUI and other AI-related services.

Source:
- https://coolify.io/docs/services/overview

---

# 29. Hermes

Coolify currently lists **Hermes Agent** in its service catalog.

Source:
- https://coolify.io/docs/services/overview

Use it as an AI service inside the private AI project.

Do not expose internal agent/admin endpoints directly to the public Internet.

---

# 30. Llama server

For the initial local model, use a small quantized model and a portable inference API.

A clean topology is:

```text
AI application
      |
      | OpenAI-compatible/local API style endpoint
      v
llama-server
      |
small quantized model
```

`llama.cpp` provides Docker/server documentation and a server implementation.

Source:
- https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md

The application should refer to an abstract model endpoint rather than hard-coding a future GPU machine.

Example concept:

```text
LLM_BASE_URL=http://llama-server:8080
```

The exact port/name should match the deployed Compose definition.

---

# 31. CPU-first AI testing

Start the small local model on CPU.

The Quadro M2000M should be considered optional experimental hardware, not an architectural dependency.

NVIDIA's current CUDA-on-WSL documentation explicitly identifies Maxwell GPUs as not officially supported in WSL2, although they may work in some cases.

Source:
- https://docs.nvidia.com/cuda/wsl-user-guide/

Because your model is only for initial testing, the right optimization is to validate:

```text
Hermes
API integration
model behavior
application integration
latency
memory
```

before spending complexity on GPU acceleration.

---

# 32. Quadro M2000M policy

The M2000M can be experimented with later.

Do not make any of these depend on it:

```text
WordPress
Coolify
Cloudflare
API platform
Hermes orchestration
server availability
```

If local GPU inference later proves useful, test it as an isolated enhancement.

If a modern GPU becomes necessary, the natural evolution is:

```text
Current
Coolify -> local CPU LLM

Future
Coolify -> AI API -> dedicated GPU server
```

This preserves application portability.

---

# 33. Do not add LiteLLM initially

Coolify currently provides LiteLLM as an AI service. LiteLLM can provide a gateway for multiple model providers/backends.

Source:
- https://coolify.io/docs/services/litellm

But initially there is only one local test model.

Use:

```text
AI application
    -> llama-server
```

Later, when multiple backends exist:

```text
AI application
    -> LiteLLM
       +--> local llama-server
       +--> Ollama
       +--> external model providers
       +--> additional model servers
```

Do not create extra infrastructure before the requirement exists.

---

# 34. Resource limits

Coolify supports CPU/memory limits for applications.

Source:
- https://coolify.io/docs/applications/configuration/resource-limits

It also supports resource limits for database containers.

Source:
- https://coolify.io/docs/databases/configuration/resource-limits

### Policy

Start by measuring.

Do not apply extremely low hard caps immediately.

Coolify explicitly warns that:

- too-low application memory can cause OOM termination;
- too-low CPU can cause health checks/timeouts;
- too-low database limits can break startup, backups or queries.

Therefore:

```text
AI -> measure -> cap if useful
DB -> measure -> cap if useful
WEB -> measure -> cap if useful
```

This is safer than guessing.

---

# 35. Public AI security

Do not expose:

```text
llama-server
Hermes internals
Qdrant
MariaDB/MySQL
Redis
phpMyAdmin
Docker socket
```

Public access should terminate at your controlled application/API layer.

The API should enforce:

```text
authentication
authorization
rate limiting
request validation
logging
model selection
```

---

# 36. Monitoring

At the Windows level monitor:

```text
Memory
CPU
C: free space
SSD activity
```

Useful checks:

```powershell
Get-PSDrive C |
    Select-Object Name,
        @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,1)}}
```

For Docker/WSL:

```powershell
wsl -l -v
```

and, when appropriate:

```powershell
wsl --shutdown
```

For the Linux server:

```bash
free -h
df -h
docker system df
```

For live applications, use Coolify's metrics/logs and health checks.

Coolify documents metrics and health-check functionality for applications and databases.

Sources:
- https://coolify.io/docs/applications/configuration/overview
- https://coolify.io/docs/databases/operations/overview

---

# 37. Host memory operating rules

Use these as practical guardrails, not hard OS requirements.

### Healthy

```text
Host available RAM > 8 GB
```

### Watch

```text
Host available RAM 4–8 GB sustained
```

Review:

- Docker Desktop workloads;
- browser/WorkBuddy;
- AI model size/context;
- Coolify VM growth.

### Pressure

```text
Host available RAM < 4 GB sustained
```

Take action by reducing workloads rather than killing Windows internals.

---

# 38. C: storage operating rules

### Healthy

```text
C: free > 60 GB
```

### Watch

```text
C: free 50–60 GB
```

Stop unnecessary storage growth and prune known-unused Docker artifacts.

### Danger

```text
C: free < 50 GB
```

Treat this as a Windows host incident:

1. stop server growth;
2. remove/move archives;
3. inspect Docker usage;
4. expand/migrate storage only after planning.

The goal is to protect the Windows OS and everyday workload.

---

# 39. Docker storage policy

Inspect first:

```bash
docker system df
```

Do not blindly run aggressive `docker system prune -a --volumes` against a machine containing live databases.

Never delete a volume containing application/database data simply because no current container is attached to it.

---

# 40. VM checkpoints are not backups

Do not use Hyper-V checkpoints as the primary backup mechanism.

Checkpoints may be useful for controlled maintenance, but they do not replace:

```text
database backups
application backups
Coolify recovery backups
```

The authoritative recovery source should be a verified independent backup.

---

# 41. Windows 10 lifecycle risk

Windows 10 normal support ended on:

```text
October 14, 2025
```

Source:
- https://learn.microsoft.com/en-us/microsoft-365-apps/end-of-support/windows-10-support

Microsoft's current lifecycle documentation describes Extended Security Updates for qualifying Windows 10 editions/uses through the relevant ESU period.

Source:
- https://learn.microsoft.com/en-us/lifecycle/faq/extended-security-updates

As of October 4, 2026, this should be treated as **temporary infrastructure**.

Do not turn this into a permanent production commitment.

If an applicable ESU path is available for the machine, keep it patched while the transition lasts.

---

# 42. Recovery after complete laptop restart

Target behavior:

```text
Laptop powered on
      |
      v
Windows boots
      |
      v
Hyper-V starts
      |
      v
Platform-Server VM starts automatically
      |
      v
Ubuntu boots
      |
      v
Docker starts
      |
      v
Coolify starts
      |
      v
Traefik starts
      |
      v
cloudflared reconnects
      |
      v
Websites become reachable
```

This is one of the principal reasons for choosing Hyper-V plus a Linux VM rather than making Docker Desktop itself the public server platform.

---

# 43. Recovery if the VM is intentionally stopped

From an elevated PowerShell session:

```powershell
Get-VM
Start-VM -Name "Platform-Server"
```

Then verify the Linux services.

Coolify and Docker should use appropriate restart behavior so that containers return after the VM is rebooted.

---

# 44. Current Docker Desktop should not be removed

Keep it for:

```text
coding
local builds
AI experiments
temporary stacks
debugging
```

The role separation is:

```text
Docker Desktop / WSL2
    = DEV / TEST

Hyper-V Linux + Docker + Coolify
    = HOSTED PLATFORM
```

This separation is deliberate and valuable.

---

# 45. Final application lifecycle

### Add WordPress domain

```text
Coolify
  -> WordPress
  -> DB
  -> Domain
  -> Deploy
```

### Add custom Docker application

```text
Coolify
  -> Application
  -> Git / Docker image / Compose
  -> Domain
  -> Variables
  -> Deploy
```

### Add multi-container platform

```text
Coolify
  -> Compose/service
  -> Domain(s)
  -> Persistent storage
  -> Deploy
```

### Add AI stack

```text
Coolify
  -> AI project
  -> Hermes
  -> llama-server
  -> supporting services only when needed
```

---

# 46. Why no second hosting panel

The user wants a Plesk-like experience.

Coolify supplies the closest fit needed for this architecture:

```text
Domains
Applications
Services
Databases
Docker
Compose
Git deployments
Proxy
TLS
Logs
Metrics
Resource limits
```

Adding Plesk on top would create duplicate management semantics.

Adding CasaOS + NPM would create overlapping management and routing layers.

Therefore:

```text
ONE CONTROL PLANE = COOLIFY
```

---

# 47. Why not CasaOS + Nginx Proxy Manager

The original architecture was sensible for a basic home server, but your requirements are broader:

```text
WordPress
Docker applications
AI
Hermes
Llama
multiple domains
Compose
migrations
backups
resource management
```

Coolify is more directly designed for that workload.

The earlier architecture therefore becomes the reference that was superseded by the current design. fileciteturn0file0L1-L3

---

# 48. Why not run the public platform directly in Docker Desktop

Because Docker Desktop is the development environment and shares WSL resources with the Windows host.

It is better to keep:

```text
Development
    -> Docker Desktop / WSL2

Hosting
    -> Hyper-V Linux VM
```

This limits accidental coupling between experimental development workloads and hosted applications.

---

# 49. Why not use WSL2 alone for the hosted platform

WSL2 is excellent for development, but the platform would then combine:

```text
development
+
AI experimentation
+
public hosting
```

in a common environment.

The Linux VM creates a clean server boundary.

It also lets the server configuration move later to dedicated Linux hardware with minimal architectural change.

---

# 50. Alternative platforms investigated

## Coolify

Strengths:

```text
Docker
Compose
domains
Traefik
WordPress
databases
backups
resource limits
Cloudflare Tunnel
AI service catalog
remote deployment capability
Apache-2.0 license
```

**Selected.**

## Dokploy

Strong technical competitor with Docker, Compose, Traefik, domains, databases, WordPress and Cloudflare Tunnel support.

Its current repository also separates proprietary material under a different license.

**Not selected for this open-source-first architecture.**

## Cosmos

Strong secured home-server platform with reverse proxy/authentication and Docker management, but current licensing combines Apache 2.0 with Commons Clause.

**Not selected.**

## Runtipi

Good open-source homeserver platform with a large app ecosystem, but less aligned with deployment/PaaS-style website and AI application management.

**Not selected.**

## Umbrel

Polished home-server appliance, but its current licensing model is not the open-source foundation preferred here.

**Not selected.**

## CapRover

Valid Docker PaaS, but Coolify has stronger alignment with this combined WordPress + AI + Cloudflare + service-catalog workload.

**Not selected.**

---

# 51. Initial implementation sequence

## Phase 0 — Finish the file transfer

Do not create the VM while the large copy operation is running.

Finish moving large personal files to E:/other storage.

Then check:

```powershell
Get-PSDrive C,E |
    Select-Object Name,
        @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,1)}},
        @{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,1)}}
```

Use the storage decision tree in Section 12.

## Phase 1 — Create VM

Recommended:

```text
Name:          Platform-Server
Generation:    2
Startup RAM:   4096 MB
Minimum RAM:   4096 MB
Maximum RAM:   10240 MB
Buffer:        20%
vCPU:          2
Network:       Default Switch
Disk:          Dynamic VHDX
```

## Phase 2 — Ubuntu

Install Ubuntu Server 24.04 LTS and OpenSSH.

## Phase 3 — Coolify

Install using the official script.

Immediately:

- create admin;
- enable 2FA;
- preserve `APP_KEY` recovery material.

## Phase 4 — Cloudflare

Create one Tunnel.

Deploy `cloudflared` through Coolify.

Follow Coolify's All Resources route.

Use:

```text
http://localhost:80
```

and disable Coolify's HTTP-to-HTTPS redirect for this tunnel mode.

## Phase 5 — First WordPress

Deploy only one site first.

Test:

```text
domain
HTTPS
Cloudflare
Tunnel
Traefik
WordPress
DB
wp-admin
uploads
permalinks
```

## Phase 6 — Backup/restore

Perform both:

```text
database backup
restore test
```

and:

```text
WordPress file backup
restore test
```

## Phase 7 — AI

Deploy:

```text
Hermes
llama-server
small model
```

CPU-first.

Measure:

```text
RAM
CPU
latency
tokens/sec
```

Only then investigate the Quadro.

---

# 52. Acceptance tests

The platform is not considered complete until:

### Host

```text
Windows remains responsive
```

### VM

```text
VM starts automatically after Windows reboot
```

### Docker

```text
containers restart correctly
```

### Coolify

```text
dashboard works
proxy works
resources deploy
```

### Cloudflare

```text
external HTTPS works
no router port forwarding required
```

### WordPress

```text
wp-admin works
media works
permalinks work
DB backup works
DB restore works
```

### AI

```text
Hermes works
llama-server works
small model loads
application can call model
```

### Recovery

```text
reboot laptop
  -> VM starts
  -> Docker starts
  -> Coolify starts
  -> Tunnel reconnects
  -> websites return
```

---

# 53. Final canonical architecture

```text
                                  INTERNET
                                      |
                                      v
                               +--------------+
                               |  CLOUDFLARE   |
                               | DNS / Edge    |
                               | HTTPS / WAF   |
                               +------+-------+
                                      |
                              Cloudflare Tunnel
                                      |
                                      v
+-------------------------------------------------------------------+
|                         WINDOWS 10 PRO                            |
|                                                                   |
|  Everyday workload                                                |
|                                                                   |
|  +--------------------------+    +------------------------------+ |
|  | Docker Desktop / WSL2    |    | Hyper-V                     | |
|  |                          |    |                              | |
|  | DEVELOPMENT / TESTING    |    | Ubuntu Server 24.04 LTS     | |
|  |                          |    |         |                    | |
|  | experimental AI          |    |       Docker                 | |
|  | local containers         |    |         |                    | |
|  | Compose testing          |    |      Coolify                 | |
|  +--------------------------+    |         |                    | |
|                                  |     Traefik                 | |
|                                  |         |                    | |
|                                  |  +------+------+---------+   | |
|                                  |  |             |         |   | |
|                                  | WEB         PLATFORM     AI | |
|                                  |  |             |         |   | |
|                                  | WP1/WP2      API      Hermes| |
|                                  | DBs          workers   Llama| |
|                                  |                         |   | |
|                                  |                      CPU-first| |
|                                  |                              | |
|                                  | cloudflared                  | |
|                                  +------------------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
```

---

# 54. Canonical policy summary

```text
WINDOWS 10
    = everyday host, transitional

HYPER-V
    = server virtualization boundary

UBUNTU 24.04 LTS
    = server OS

DOCKER
    = application runtime

COOLIFY
    = Plesk-like deployment/control plane

TRAEFIK
    = integrated reverse proxy

CLOUDFLARE TUNNEL
    = public ingress without router port forwarding

DOCKER DESKTOP / WSL2
    = development/testing only

HERMES + llama-server
    = private AI test stack

QUADRO M2000M
    = optional experiment, never a dependency

C: SSD
    = live server storage, with large Windows reserve

E: USB
    = optional secondary backup/archive only
```

---

# 55. Exact host baseline to preserve

Your measured post-cleanup baseline was approximately:

```text
Windows in use:       ~10.2 GB
Available:             ~21.7 GB
Cached:                 ~7.7 GB
```

This is the baseline we should compare against after adding the new Hyper-V VM.

Do not optimize for a low Task Manager percentage. Optimize for:

```text
Windows responsiveness
VM stability
application latency
sufficient free C: space
successful backups
successful recovery
```

---

# 56. Final one-sentence recommendation

> **Run a resource-bounded Ubuntu Server 24.04 LTS VM under Hyper-V on the Windows 10 Pro laptop, use Docker + Coolify as the sole hosting/control plane, expose applications through one Cloudflare Tunnel and Coolify's Traefik proxy, keep Docker Desktop/WSL2 as the separate development environment, run Hermes plus a small CPU-first llama-server test stack privately, and preserve the Quadro GPU only as an optional experiment while keeping the entire workload portable to future dedicated hardware.**

---

# 57. Validation sources

### Coolify

- Self-hosted requirements and installer:
  https://coolify.io/docs/start-with-self-hosted
- Applications:
  https://coolify.io/docs/applications
- Services:
  https://coolify.io/docs/services
- Service catalog:
  https://coolify.io/docs/services/overview
- WordPress:
  https://coolify.io/docs/services/wordpress
- phpMyAdmin:
  https://coolify.io/docs/services/phpmyadmin
- Domains:
  https://coolify.io/docs/core/networking/domains
- Traefik:
  https://coolify.io/docs/core/networking/proxy/traefik/overview
- Cloudflare Tunnel overview:
  https://coolify.io/docs/integrations/networking/cloudflare/tunnels
- Cloudflare Tunnel all resources:
  https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource
- DB restore:
  https://coolify.io/docs/databases/restore
- DB backups:
  https://coolify.io/docs/databases/backups
- DB operations:
  https://coolify.io/docs/databases/operations/overview
- Application resource limits:
  https://coolify.io/docs/applications/configuration/resource-limits
- Database resource limits:
  https://coolify.io/docs/databases/configuration/resource-limits
- Security:
  https://coolify.io/docs/core/security-model
- Instance backup:
  https://coolify.io/docs/core/backup-and-recovery/instance-backup
- License:
  https://github.com/coollabsio/coolify/blob/main/LICENSE

### Microsoft / Hyper-V

- Hyper-V requirements:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/host-hardware-requirements
- Install Hyper-V:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v
- Create VM:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/create-a-virtual-machine-in-hyper-v
- Dynamic Memory:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/dynamic-memory
- Ubuntu on Hyper-V:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-ubuntu-virtual-machines-on-hyper-v
- Hyper-V automatic start/stop:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology
- Start-VM:
  https://learn.microsoft.com/en-us/powershell/module/hyper-v/start-vm
- Hyper-V NAT:
  https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network

### Docker / WSL

- Docker Desktop WSL2:
  https://docs.docker.com/desktop/features/wsl/
- WSL best practices:
  https://docs.docker.com/desktop/features/wsl/best-practices/
- Resource Saver:
  https://docs.docker.com/desktop/use-desktop/resource-saver/

### NVIDIA

- Current CUDA on WSL guide:
  https://docs.nvidia.com/cuda/wsl-user-guide/

### llama.cpp

- Docker/server documentation:
  https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md

### Windows lifecycle

- Windows 10 end of support:
  https://learn.microsoft.com/en-us/microsoft-365-apps/end-of-support/windows-10-support
- Microsoft ESU lifecycle FAQ:
  https://learn.microsoft.com/en-us/lifecycle/faq/extended-security-updates

---

## Source-basis note

This document supersedes the earlier Windows 10 + VirtualBox + Ubuntu + CasaOS + Nginx Proxy Manager plan. The earlier plan is retained only as the starting point that was reviewed and simplified. fileciteturn0file0L1-L3

The final architecture was deliberately revised to reflect the actual measured host environment, the existing Docker Desktop/WSL2 development workflow, the small local AI model requirement, and the need for a Plesk-like deployment experience without stacking multiple management panels.
