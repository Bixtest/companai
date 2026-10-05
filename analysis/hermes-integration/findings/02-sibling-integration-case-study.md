# Batch 02 — The sibling Paperclip–Hermes integration as a case study

## Short assessment

The sibling demonstrates both the value and cost of treating Hermes as an agent runtime under a separate company control plane. It is evidence for adapter contracts, run lifecycle, profile materialization, approvals, skill publication, background work and operational incidents. It is not a blueprint to transplant: it is a different Paperclip-based product with GRC-specific concerns, a substantially dirty source tree and explicit multi-company/security gaps in its own study.

The completed Paperclip study's batch 09 is the principal forensic source. This follow-up spot-checked current Compose runtime comments, ACP adapter, provisioning service, architecture decision, recovery plan and gap ledger. aissistant-package had 3,766 modified/untracked status entries; current working tree is not a stable release baseline.

## Architecture pattern worth learning

The sibling Paperclip fork is the control plane: company, agent employment, projects/issues, work/wake, budget, approval, audit and tools. Hermes executes the loop, native sessions, memory, skills and selected tools. The browser talks to the host, not directly to Hermes/dashboard. Its ADR defines a narrow AiRuntimePort, execution envelopes, and separate identifiers for run, transcript, memory scope, room, issue and capability grant. This resists a generic untyped proxy and avoids conflating a task, conversation and long-term memory.

The transferable pattern is **explicit capability ownership + versioned runtime contract + per-run immutable scope + platform-owned authorization**. For our Starting Kit, replace Paperclip host concepts with Open Mercato canonical model, principal/security context, domain capabilities, Business IR/command gateway, queue, audit and future room/widget model. The six port categories in the sibling ADR (capabilities, execution, conversations, assets, administration, diagnostics) are a catalogue to consider; we do not need six deployed services or all endpoints at once.

## What implementation evolution teaches

The forensic study found four Hermes wiring generations: shared gateway, per-employee gateway containers, per-employee ACP containers, and a shared runtime container that starts an ACP process per execution with per-agent HERMES_HOME. Current root compose comments use the shared runtime model; some docs still describe per-agent containers. Current ACP adapter builds a docker exec -i ... hermes-acp command, selects the employee home through HERMES_HOME, forwards run context variables, and records billing conservatively when provider is unknown.

Lessons:

1. Runtime identity/configuration can live in a Hermes home/profile rather than a dedicated container per agent; container-per-agent is not an architectural law.
2. Sharing a container does not establish tenant isolation. The boundary moves to profile path selection, file permissions, SQLite/process locking, env/secret forwarding, subprocess control, logs, network and concurrency. A shared container's fixed resource ceiling also creates noisy-neighbor risk.

The study records naming collisions that caused an unexpected container adoption, stale Compose overrides, callback failure after an emergency test bypassed normal wake admission, and a separate spend limit that paused work. It identifies a critical knowledge-sidecar flaw: optional/empty authentication plus caller-asserted actor fields; planned second-company support was not safe. These warn against name-derived identity, bypassed admission, trusting actor strings, optional auth and calling a prototype multi-tenant.

The sibling also found that checked-in Hermes source was a reference copy while the runtime image ran a different upstream version. The Starting Kit needs a pinned image/source digest and compatibility harness. Our requested Hermes snapshot lacking .git makes this especially relevant.

## Adopt, alter or reject

| Sibling pattern | Disposition for our product | Reason |
|---|---|---|
| AiRuntimePort / typed contracts | Adopt boundary idea; define smallest Open Mercato contract around actual runs/lifecycle | Mockable and replaceable; carries our authenticated context and Business IR references |
| Immutable run envelope with distinct IDs | Adopt, mapped to Tenant, Principal, Agent, Task/Run, Conversation/Room, capability grants and policy/model versions | Avoid conflating issue, session, user, memory and profile |
| Hermes profiles for per-agent state | Adapt after threat modeling; profiles are runtime homes, not tenant authorization | Profile alone does not isolate company, services or side effects |
| Hermes native sessions and memory | Reuse runtime state if intended; platform remains authority for identity, records, retention and authorization | Avoid second business database and split-brain control plane |
| Skill promotion and pinned skill bundles | Adopt governance process, not sibling templates | Skills are untrusted procedural artifacts; business truth comes from canonical model |
| Platform-hosted business approvals | Adopt | Owner's autonomy model is action-specific; platform owns business command authorization |
| Hermes cron for company business jobs | Reject as authority; allow runtime chores only | Product plan assigns business schedules/events to Starting Kit |
| Direct Hermes dashboard/generic proxy | Reject as product surface | Duplicate auth/authority and bypass risk |
| Sibling tenancy, actor assumptions, templates and GRC specifics | Reject | Different product, incomplete multi-company boundary and different domain |
| Container-per-agent as required topology | Reject as default; evaluate profile + worker isolation | Shared worker saves idle footprint but requires independent isolation controls |

## Failure lessons

- Provision only after authorization/admission; provisioning credentials/runtime before hire approval is a sibling P0.
- Use one normal run-admission path. Manually constructed run rows lacked source-task context needed by callbacks.
- Unknown cost stays unknown; local free inference should not be counted as paid. Define per-run vs cumulative usage to prevent resume double counting.
- Broker callbacks; do not put credentials in model-visible prompt/instructions. A run JWT in instructions was documented as emergency recovery, not target.
- Knowledge writes require verified service identity. Client actor strings cannot prove identity; approve/write must verify principal and tenant/company scope.
- Private Docker network is not automatic authorization. Authenticate service calls and enforce scopes.
- Pin runtime versions and test compatibility because source/image/API can drift.
- Distinguish working tree and deployed state; use immutable image digest and record tested source/runtime pair.

## Evidence limits

Forensic batch 09 confirms its details against the then-inspected tree and lists what it could not verify. This follow-up did not run the sibling stack or resolve all changed files. Current Compose/ACP comments corroborate shared-runtime direction, but operational success, isolation and performance are not inferred from comments. Do not reuse container footprint numbers without measurement on our target hardware.
