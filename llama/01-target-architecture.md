# 01 — Target architecture

## Decision in one sentence

Make model management a native Companai product capability, while running llama.cpp inference as a separately managed process/service behind the Companai runtime contract: Starting Kit owns tenant, privacy, capability and provider policy; Hermes owns the agent loop; llama.cpp executes inference; the platform's MCP/domain boundary remains the only route to governed business actions.

## Corrected premise: what runs “inside Hermes”

Hermes Agent is not itself the neural-network inference engine: open-weight model files are loaded and executed by a runtime such as llama.cpp. Hermes sends prompts and tool definitions to that runtime through a provider API. However, it is too broad to say Hermes cannot manage models: current official Hermes documentation describes a Local Models feature that manages llama.cpp and model files in supported desktop/local modes. Hermes also supports connecting to an externally managed endpoint. Distribution and launch mode matter; the managed desktop feature should not be assumed to exist in Companai's headless Compose deployment.

There are three choices, not a binary “put model in Hermes or keep it outside”:

1. **Inference execution:** model weights execute in an engine process, not Hermes' agent loop.
2. **Runtime/model management:** Hermes may manage a local runtime for standalone use; Companai can instead own lifecycle/policy for its product deployment.
3. **Product integration:** Companai can present and govern models natively while preserving the runtime process boundary for isolation, scaling and upgrades.

For the multi-tenant end product, choose (3): product-native control plane and management, separately isolated data-plane inference worker. Hermes can retain its standalone Local Models experience outside the Companai-managed production path.

## Proposed component map

```text
User / channel
      │
      ▼
Starting Kit: identity, tenant, policy, approvals, audit, business context
      │                         │
      │ agent request           └── model policy: capability + privacy + budget
      ▼                                      │
Hermes: session, planning,                  ▼
skills, agent tool loop              Companai Model Broker / Runtime API
      │                                      │
      ├── governed MCP tools ──► Starting Kit MCP ──► policy gate + domain services
      │                                      │
      └── inference request (scoped,          ├── LlamaCppRuntime ──► llama-server
           capability/profile)               ├── cloud/local adapters
                                             └── embedding/rerank runtime
```

The drawing is a target, not a statement that all current code routes through a broker. Existing docs show both the Starting Kit's OpenAI-style provider settings and separate Hermes local/custom provider configuration. Consolidating policy while preserving the two call patterns is a key design task. The distinction is between the management/control plane (which should feel native to Companai) and the inference/data plane (which may remain a separate service).

## Ownership boundaries

| Concern | Owner | Implication for llama integration |
|---|---|---|
| Tenant/user identity and acting principal | Starting Kit | The model never establishes identity. Broker derives tenant policy from trusted server-side context, never from prompt text or caller-supplied tenant ids alone. |
| Authorization, approval, record scope, business writes | Starting Kit policy gate/domain services | A generated tool call is a proposal. It must pass the ordinary platform MCP/authz path; the model server cannot authorize it. |
| Agent loop, conversation/session, skills and agent tool orchestration | Hermes, for Hermes-backed tasks | Do not reimplement Hermes in llama-server. Keep platform business state out of Hermes-local state unless explicitly designed as a cache. |
| Model capability and allowed provider/profile | Starting Kit Model Broker/Policy | Single source of model eligibility, privacy locality, capability, limits and fallback. No contradictory per-agent override that bypasses tenant policy. |
| Token generation and model loading | llama.cpp runtime, orchestrated by Companai in managed deployments | Serve a qualified model on private service networking; no business database credentials or tenant data store. A separate process/container does not imply a separate product or independent tenant policy. |
| Business record truth and durable audit | Starting Kit/Postgres/ledger | Record request/decision/tool-call provenance at platform boundaries; inference logs alone are not the audit record. |
| Infrastructure scheduling, retries and queueing | Platform/runtime orchestration | Bound inference concurrency and handle unavailable/overloaded model service independently from customer-facing web availability. |

## Request flow and tenant isolation

1. Authenticate the human/service caller and resolve tenant/organization using the Starting Kit's trusted identity context.
2. Apply tenant policy to the request: whether AI is enabled; data locality/classification; allowed profiles/providers; capabilities; context/token limits; retention/logging; time/cost/resource budget; fallback behavior.
3. For Hermes work, create a platform-authorized agent invocation carrying a server-side correlation/tenant context. Hermes receives only the permitted task context and tools. Do not expose a broad shared inference API key or business DB access to prompts/tools.
4. Broker selects a qualified model profile for the required capability and calls `llama-server` with bounded inputs. The model alias is a deployment identifier, not tenant authority.
5. Hermes may propose calls to platform MCP tools. The MCP server re-authenticates the service/user/tenant context and authorizes every call with the platform's resolver. Validate arguments/schema and any approval rules before mutation.
6. Persist the platform audit decision, invocation/correlation IDs, selected provider/model/profile version, capability, policy version, and tool outcomes under the platform's retention rules. Avoid recording raw prompt/response by default; if retained for debugging, redact and tenant-scope access.
7. Return an explicit unavailable/queued response if the model is down or overloaded. Never widen tenant scope, silently switch to an unapproved provider, or bypass the gate to preserve apparent availability.

### Shared inference process is not equivalent to shared tenant memory

A stateless inference request can be served by one shared process, but multi-tenancy still needs controls for request bodies, server logs, prompt/KV/session handling, cancellation, cache behavior, queue fairness, model/profile access, rate limits and observability. Confirm the exact server's state/cache semantics before relying on them. Partition or avoid cross-request reusable state where data isolation cannot be guaranteed. Keep session memory and authorization decisions above the model server.

## Broker and runtime contract

The AI-first design proposes a provider-neutral `ModelRuntime`. Make the request explicit enough that a runtime cannot infer policy from a prompt:

```text
ModelRequest {
  invocation_id, tenant_policy_ref, purpose/capability,
  messages_or_input, output_schema?, tools?,
  requested_profile?, max_input_tokens?, max_output_tokens?, timeout,
  privacy_class, streaming?, cancellation_signal
}
ModelResult {
  provider_id, model_id, model_revision, runtime_revision,
  capability, structured_content/tool_calls, usage?, latency?, finish_reason,
  policy_revision, correlation_id
}
```

The policy reference must be unforgeable or reconstructed by trusted server-side code. Do not place the only tenant guard in a JSON body sent to a generic endpoint.

Candidate common capabilities from the vision: `chat`, `structured_output`, `tool_call`, `embed`, `vision`, `rerank`, and task adapters such as `summarize`/`classify`. A model only advertises capabilities after qualification. A `LlamaCppRuntime` translates common calls to supported HTTP endpoints, normalizes provider response differences, and returns explicit unsupported/unavailable errors. Avoid a lowest-common-denominator API that hides useful differences or treats “OpenAI-compatible” as perfect equivalence.

### Two sensible implementation seams

- **Preferred target:** broker is the shared policy and model selection layer; `LlamaCppRuntime` is one adapter. Hermes receives a configured endpoint/profile selected by platform orchestration, while direct platform AI features use the same policy/adapter service.
- **Incremental bridge:** keep Hermes's provider configuration and Starting Kit's provider factory initially, but derive both from one platform model registry/policy and one deployment manifest. This avoids an immediate invasive proxy while preventing config drift. It is transitional: it must not become two independent authorities.

Do not assume Hermes can natively call an arbitrary internal broker contract without a custom provider/proxy seam. Verify the exact Hermes version and integration point before choosing the transport. Keep local-provider specifics in Hermes configuration tooling, not manually edited generated config if Hermes owns that file.

## Which layer owns model choice?

Use policy-first selection. The Starting Kit decides the *allowed set* for the tenant and request purpose; the broker selects from that set according to capability, quality, latency, locality, load and cost. Hermes may choose within a platform-approved model/profile set for agent-level tasks, but it must not bypass a tenant's provider/privacy ceiling. This matches the AI-first document's modes: Hermes-managed for simple deployments, policy-managed when tenant constraints require it, and hybrid/adaptive when the centralized policy is mature.

Never silently change the model behind a saved deterministic Function. Ordinary assistive chats can use a newer eligible model under policy. A Function with an AI step should record the Function version, policy/model profile version and structured contract, and define how upgrades are qualified.
