# Batch 04 — Recommended Hermes integration architecture and order

## Recommendation

Integrate Hermes as the **agent execution kernel inside Open Mercato product architecture**, behind a typed internal runtime port owned by packages/ai-assistant. Keep business-model, security and workflow layers authoritative. Do not bring in Paperclip as a second control plane; implement useful Paperclip-derived patterns as Open Mercato entities, queue records, approvals, budgets, audit and native UX, as the development pipeline intends.

**Initial implementation shape:** one product/repository and deployment workflow, with a supervised private Hermes Python worker/container alongside the Starting Kit. It should not expose an independently user-administered Hermes account/dashboard. Invoke through an internal versioned execution contract; use durable Starting Kit jobs for background runs and an explicit stream bridge for interactive turns. This is a native internal implementation, not literally one OS process. Node 24 / TypeScript and Python 3.14 make a Python worker/process the pragmatic early boundary. A future in-process bridge or TypeScript port is an optimization, not an assumption.

Project docs say both “Hermes is in-process” (AGENT-HALF.md) and describe a separate Hermes Compose service (development/ARCHITECTURE.md). The kernel spec leaves boundary/profile choice B-05 open. This report recommends an internal port and private runtime process as the safest route but does not close B-05 on behalf of the owner.

## Why not merge the entire Hermes application into Next.js?

Hermes is a substantial Python application with agent runtime, session DBs, user homes/profiles, CLI, gateways, cron, plugins, providers, tools and OS-specific backends. Importing all of it would duplicate account/profile/config/auth/persistence surfaces and expose a large privileged feature set. A literal Node/Python single-process bridge adds native runtime/lifecycle complexity; a monorepo alone does not make it faster. Keeping the sibling Paperclip model would duplicate the control plane the Starting Kit roadmap is extending.

The target is **unified ownership and product experience, not necessarily one process**: one canonical domain/security model, user-facing product, work lifecycle and audited capability registry, with Hermes hidden behind a local runtime port.

## Suggested boundary contract

Start small:

- describeCapabilities(runtimeVersion): runtime version, supported tool delivery, limits and health.
- startRun(admittedEnvelope): start using platform-generated scope and runtime/session binding.
- streamRun(runId): ordered typed text/tool/status/usage events.
- cancelRun(runId) / steerRun(runId, instruction): only if approved semantics exist.
- resumeConversation(conversationBinding, input): explicit session continuity.
- resolveToolCall(call, capabilityGrant): invoke platform tools through authenticated gateway, never direct DB/network authority.
- completeRun(runId, result): structured outcome/error/usage and provenance; callback idempotent.

Envelope carries schema version, run ID, tenant ID, principal/actor ID, agent ID/kind, task/work ID, platform conversation/room ID, Hermes session ID, capability grant ID, policy/model versions, allowed input refs, deadline, budget and correlation ID. Tenant/actor values are server-generated and immutable. Secrets are referenced and brokered least-privilege; never model-visible instructions. Keep run, transcript, memory, room, task and profile identifiers distinct.

Runtime state is separate from business task state. Hermes failure can retry an eligible run without rewriting assignment/business state. Usage declares per-run vs cumulative-session; actual provider/model attribution comes from runtime events or remains unknown.

## Persistence and identity

- Canonical platform records: tenant/org, principal/user, agent kind/owner/role, task, durable wake/run, conversation/room membership and transcript visibility, approvals, capability grants, budgets, audit and schedule.
- Hermes-owned runtime records: loop message state, compression artifacts, internal indexes, memory mechanics and runtime-local artifacts.
- Platform mapping: platform conversation/task/run to Hermes session/profile/runtime version. Hermes IDs are not business IDs.
- A transcript, memory, skill or summary never becomes authoritative business truth merely by existing.
- If state.db/filesystem homes remain, enforce tenant and agent scoping below the model. Use explicit isolated storage roots and restricted permissions; evaluate SQLite locking and warm-session behavior. A tenant string in a profile name is not isolation.
- Profile topology follows five agent kinds and security requirements. Personal/context agents may need principal-bound state; role/independent/system have different sharing/lifecycle. Do not default to one profile per tenant or user without tests.

## Capability admission

1. Resolve authenticated principal and current tenant/org membership in Open Mercato.
2. Resolve agent kind/owner/actsAs, role, autonomy gate and task context.
3. Resolve capabilities against policy, data classification, local/cloud model policy and approval.
4. Persist an admitted run/wake with idempotency, deadline, budget and trace IDs.
5. Execute Hermes with restricted tools, no direct DB authority and no ambient host secrets.
6. Re-authorize each business tool call against current state; a stale run envelope does not bypass revoked access.
7. Record tool call, policy decision, model/provider/usage, approval, data refs and resulting business events in platform audit.
8. Persist canonical outputs in platform records; keep runtime transcript/session mapping separate.

Security is a launch gate. The current AI module's checks, tenant-scoped repositories and pending actions are valuable, but prior code analysis found larger security-kernel gaps. Broad Hermes tools before enforcement/context firewall/data-axis work would create an authority bypass.

## Integration order

| Order | Pipeline landing | Hermes use | Exit gate |
|---|---|---|---|
| 0 | Sprint 0 workbench/model server | Run Hermes locally against local inference | Re-run pinned image/revision; document evidence. Smoke test grants no product authority. |
| 1 | Business Model Kernel + IR; Agent/Task contracts (G-01/G-02/AH-1) | Generate typed IR/task output; profile/session only runtime binding | Canonical IDs/ownership/contracts; compiler injects scope; no prompt tenant scope. |
| 2 | Security floor: classification, data-axis auth, AI guards, ledger/RLS (G-04/G-05/G-06/G-15/G-16) | Narrow tools, scoped request, approved model/data locality | Deny-by-default; tenant/actor/object/field/value/relationship tests; no authority increase. |
| 3 | Internal runtime port + worker/adapter | Run/stream/cancel/resume; platform tool bridge | Version/contract checks; process lifecycle; multi-tenant isolation; no secrets in prompts/logs; tested cancellation/retry/idempotency. |
| 4 | Workspace/Rooms, Widgets, references, User Functions | Assist with typed artifact authoring and conversations | Native product surface; published Function executes without LLM; canonical room/session mapping. |
| 5 | Agent half: task assignment, bounded delegation, wake/events/schedules/budgets | Execute admitted jobs and bounded decomposition | Starting Kit scheduler/queue owns business jobs; durable work/run, idempotency, audit, budgets and stop control. |
| 6 | Skills, knowledge, optional channels/tools | Propose learned skills; retrieve approved sources | Quarantine/scan/version/approve; cross-tenant isolation; no unreviewed plugins. |
| 7 | Sandbox and optional expansion | Terminal/browser/subagents/messaging for explicit use cases | Threat model, disposable sandbox, quotas/network policy, SLO and load measurement, pinned dependencies. |

Respect the product plan: Hermes is unnecessary for the business-model spine; security precedes broad tools; deterministic Functions do not call an LLM at runtime. Use AGENT-HALF phases rather than a second roadmap.

## Performance strategy

No performance advantage is demonstrated. A private local worker avoids external-service administration but still has IPC/serialization/container overhead. Embedding Python could remove a hop while increasing crash coupling, memory footprint and contention. Hermes SQLite/files may suit runtime state, but shared homes can create contention/isolation risks. Benchmark before deciding.

Compare representative interactive and background workflows: time-to-first-token, total latency, queue delay, tool round trip, warm/cold resume and recall, cross-tenant concurrency, token/provider cost, p50/p95, worker RSS/CPU, DB/SQLite locks and restart recovery. Compare current ai-assistant path, Hermes worker and any in-process prototype using same model/tool/data; separate inference latency from integration overhead.

## Decision register

| Decision | Source-doc state | Recommendation |
|---|---|---|
| Platform/runtime ownership | Settled in AI-first docs | Platform owns business truth/authorization; Hermes owns runtime mechanics |
| Use Hermes rather than build another loop | Product direction / owner confirmed | Use Hermes for runtime; retain existing AI assistant paths until migration proven |
| Literal process topology | AGENT-HALF says in-process; Compose uses separate service; B-05 remains open | Internal runtime port; likely private Python worker first. Owner ratification needed before encoding final topology. |
| Tenant/profile mapping | Operational choice remains open | Derive from five agent kinds and authorization; never equate tenant/profile; prove isolation |
| Business scheduler | C-3 conditional on G-18 enforcement | Starting Kit owns business scheduling/admission; Hermes cron only runtime chores until gate exists |
| Runtime memory/session vs platform knowledge | C-6 split recorded | Hermes owns runtime memory/session mechanics; platform owns business truth/tenant knowledge/access; no parallel memory authority |
| Product dashboard | V-04 decision fired by G-07, pending owner in backlog | Native UXAIOS surfaces; Hermes dashboard operator-only/internal |
| Multi-agent rooms | Product target; Paperclip lacks first-class room | Platform Workspace/Room canonical; Hermes per-agent session is a projection |
| Performance gain | No evidence | Hypothesis; benchmark |

## Risks that block broad rollout

Cross-tenant session/profile/file/skill leakage; tools bypassing policy; prompt injection from tenant knowledge; business commands without exact approvals/audit; duplicate model/transcript/scheduler/memory/secrets authority; unpinned Hermes drift; shared worker noisy neighbors or unbounded subagents; inadequate runtime-state export/deletion/retention/backup; local model tool-call/latency limits; and unresolved “in-process” meaning.

## Conclusion

Make Hermes the engine inside the Starting Kit's existing product, tenancy, security, data and work architecture. Bring over execution and learning capabilities; implement Paperclip management patterns as Open Mercato records/workflows. A bounded internal runtime port gives organic product ownership without pretending Node and Python are one process. Security enforcement, agent/task contracts, isolated runtime state, canonical transcript boundaries, durable admission and a version-pinned compatibility harness are the gates. Performance gains remain to be measured.
