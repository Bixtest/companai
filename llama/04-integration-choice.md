# 04 — What “integrate llama” means

## The corrected question

The choice is not whether Hermes or llama-server does the other's job. Hermes is the agent runtime. The open model's weights are loaded and run by an inference engine such as llama.cpp. The question is whether Companai should **own model management as a native product capability** and whether the inference engine remains a distinct process/service.

## What Hermes itself supports

Current official Hermes documentation describes both:

- a managed **Local Models** experience for supported desktop/local modes, where Hermes downloads/manages a llama.cpp engine and model files; and
- a provider configuration for an externally run OpenAI-compatible endpoint such as `llama-server`.

So the precise correction is: model inference does not execute in Hermes' agent loop, but some Hermes distributions can manage a local inference runtime and model lifecycle. Do not assume the desktop Local Models interface or its management behavior is available in the Hermes container/version used by Companai; confirm the exact embedded version and launch mode.

## The two independent axes

| Axis | Option A | Option B | Recommended for Companai |
|---|---|---|---|
| **Who owns model management?** | Hermes instance/profile manages local engine/models | Companai owns model catalog, policy, lifecycle, resource limits and status | Companai for production multi-tenant; Hermes-managed mode remains useful for standalone/dev |
| **Where does inference execute?** | In-process or tightly embedded with app/runtime | Separate llama.cpp process/container/service | Separate process/service, managed by Companai |

“Integrated into the cloth” should mean Option B on the first axis: the user experiences model setup, eligible model choices, health and policies as part of Companai. It does not require collapsing the inference process into the Hermes or web app process.

## Architecture alternatives

### 1. Let each Hermes instance/profile manage its own local models

This uses Hermes' native Local Models capability where supported.

**Good fit:** standalone desktop/dev, one user, local-only experimentation, or when Hermes owns the whole local assistant experience.

**Weak fit for Companai multi-tenancy:** duplicate model downloads/runtime processes across profiles, lifecycle/settings split between Hermes and platform, harder global resource admission, policy drift, unclear tenant fairness, and no single platform model inventory. Whether those downsides manifest depends on how Hermes is deployed; they are architecture risks, not claims that Hermes' feature is defective.

### 2. Keep an externally operated llama-server and configure Hermes to point at it

This is the current basic integration pattern and the Sprint 0 docs report it working.

**Good fit:** proves the endpoint/provider contract quickly; inference can be upgraded/scaled separately; server can be shared rather than repeated per agent.

**Weak fit if left as a disconnected sidecar:** configuration and model knowledge can remain split across `.env`, Hermes config and Starting Kit provider settings; model lifecycle is operational plumbing rather than a coherent product capability; tenant policy and capability claims may differ between clients.

### 3. Companai-native model control plane plus managed llama.cpp runtime service — recommended

Companai owns a unified model catalog/profile registry, provider/tenant policy, install/version verification, lifecycle controls, resource budgets, health/availability, model capability qualification, and observability. A platform service or deployment orchestrator creates/configures/manages the llama.cpp process/container. Hermes and platform-native AI paths receive the same approved model/provider configuration or call through a broker adapter.

**Why this best matches the vision:** it puts model choice and local/cloud policy beside platform governance, while preserving the runtime boundary for memory isolation, process failure, scaling, and independent upgrades. Hermes remains the agent runtime and can still use its supported local runtime in standalone contexts.

**Cost:** the platform must build and maintain a real model-management control plane; this is more than adding a Compose service or a model dropdown. Model download supply chain, storage, resource scheduling, capability validation, and upgrade/rollback all become product responsibilities.

### 4. Embed llama.cpp into the app or Hermes process

This would create a tighter binary/process coupling.

**Recommendation:** do not select this by default. It risks coupling model memory/CPU spikes, runtime crashes, native library builds, GPU backends, model updates and app/Hermes release cadence. It could be revisited only if target platform constraints and benchmarks show a compelling advantage and failure isolation can still be maintained.

## Recommended ownership and flow

```text
Companai model-management UX/API
  ├─ tenant policy and allowed model profiles
  ├─ artifact/runtime lifecycle, version pin and status
  ├─ resource admission, queue/concurrency and audit metadata
  └─ selected provider endpoint/profile
          │
          ├──► Hermes Agent (planning, sessions, skills, agent tool loop)
          │       ├── inference request ──► managed llama.cpp runtime
          │       └── business action ────► authenticated Starting Kit MCP/policy gate
          └──► Starting Kit-native AI path ──► same approved runtime/policy
```

The control plane should not accept a tenant/model choice merely because the prompt says so. It resolves authorization from trusted platform context. The data plane should receive only the inference request and service credentials it needs; it does not need business database access. Every business action still goes back through Starting Kit authorization.

## Integration decision

**Choose product-native model management with an external managed inference process.** In concrete terms:

1. Keep a single platform model/profile registry and policy source.
2. Manage llama.cpp runtime/model artifacts at deployment or model-service level, with pinned versions and per-deployment resource budgets.
3. Generate Hermes provider configuration from the platform-managed profile. Avoid independent per-Hermes-profile downloads in the customer-facing multi-tenant deployment.
4. Use the same policy for Starting Kit-native model calls, including embedding and any auxiliary capabilities.
5. Let standalone Hermes desktop/dev users retain Hermes Local Models where available; this is a separate operating mode, not the production tenancy authority.
6. Re-evaluate whether a broker/proxy is needed: use one if policy, per-tenant quotas, provider abstraction or telemetry cannot be consistently enforced at the application/service boundary. A proxy is not automatically required just to pass `base_url` and model settings to Hermes.

## What this does and does not assert

- **Established by current Hermes docs:** managed local-model support exists in documented supported modes; Hermes also connects to custom OpenAI-compatible servers.
- **Established by Companai's dated runbook:** the tested local arrangement used a separate `model` service at `model:8080/v1` and Hermes reached it.
- **Not established here:** the exact capabilities of the Hermes version in the running Companai container; whether its current desktop model-management code can or should be reused in a server multi-tenant context; current live state of embeddings/audit blockers; target-hardware performance.
- **Recommendation, not existing implementation:** Companai-owned model catalog, lifecycle API, tenancy policy and management UX.
