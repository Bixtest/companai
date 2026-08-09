# Permissive Open-Source Architecture for an AI-First Company Operating Platform

## Executive assessment

The proposed product is coherent and technically achievable, but it is not a normal enterprise application. It combines four categories that are usually sold separately:

1. A **multi-company application platform** where every customer receives a branded and isolated portal.
2. A **human-and-AI workforce operating system** with departments, teams, roles, goals, tasks, permissions, budgets and background agents.
3. A **business systems platform** covering ERP, CRM, documents, collaboration, analytics and internal applications.
4. A **company compiler** that researches a business and proposes the structures, knowledge bases, workflows, agents and applications required to operate it.

No single permissively licensed project currently provides all four categories at production quality. The strongest architecture is therefore not a large fork of one project and not an entirely greenfield build. It is a **custom company control plane and unified product layer assembled around replaceable open-source subsystems**.

The central recommendation is:

> **Build the company model, identity context, permissions, blueprint compiler, unified product API and integration control plane yourself. Reuse existing projects for agent execution, durable workflows, search, authorization, application generation, collaboration, infrastructure provisioning and business-domain engines.**

A strong reference composition is:

```text
Unified Company Portal
Cabinet-derived workspace + custom application shell + agent-native UI
                            │
                            ▼
Company Control Plane
Company Blueprint · portals · departments · roles · humans · AI staff
permissions · policies · skills · approvals · canonical entity IDs
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
Paperclip              Knowledge Plane    Integration Plane
work/governance        research/memory    flows/connectors
          │                 │                  │
          ▼                 ▼                  ▼
Hermes              Haystack/Graphiti     Temporal/Camel
agent runtime        Search/vector DB      connector workers
          │                 │                  │
          └─────────────────┼──────────────────┘
                            ▼
ERP · CRM · office · cloud · apps · analytics
```

The most important architectural distinction is that the emerging AI-native projects—Paperclip, Hermes, Cabinet and GBrain—should be treated differently from mature infrastructure such as Keycloak, OpenFGA, OPA, Temporal, Apache Camel and OpenSearch. The AI-native projects offer unusually close conceptual alignment with the product, but they are fast-moving and should remain replaceable behind provider interfaces. Their databases and internal models should not become irreversible platform dependencies. citeturn10view0turn10view1turn10view2turn10view3

The platform should not attempt to make every subsystem use the same physical database or shared tables. It should provide **one logical company data plane** consisting of canonical identities, entity mappings, events, search indexes and analytical projections, while each transactional subsystem retains its own database and validation logic.

## The platform should be divided into distinct planes

The project becomes manageable when authority is divided explicitly. Each plane should have one purpose and should communicate through stable contracts.

```text
┌──────────────────────────────────────────────────────────────┐
│ Unified Experience Plane                                     │
│ Company portals · departments · workspaces · documents       │
│ humans · AI employees · CRM/ERP views · reports · apps       │
├──────────────────────────────────────────────────────────────┤
│ Application Composition Plane                                │
│ BFF/API gateway · commands · notifications · search          │
│ frontend schemas · module manifests · streaming              │
├──────────────────────────────────────────────────────────────┤
│ Company Control and Context Plane                            │
│ tenants · portals · principals · roles · scopes · policies   │
│ company blueprint · approvals · canonical identities         │
├──────────────────────────────────────────────────────────────┤
│ Workforce and Knowledge Plane                                │
│ Paperclip · Hermes · knowledge governance · skills · memory  │
├──────────────────────────────────────────────────────────────┤
│ Integration and Process Plane                                │
│ connections · workflows · mappings · events · durable runs   │
├──────────────────────────────────────────────────────────────┤
│ Business and Productivity Systems                            │
│ ERP · CRM · documents · spreadsheets · chat · BI · apps      │
├──────────────────────────────────────────────────────────────┤
│ Infrastructure and Security Plane                            │
│ identity · authorization · secrets · telemetry · deployment  │
└──────────────────────────────────────────────────────────────┘
```

**The Unified Experience Plane** should provide one coherent product rather than expose six unrelated administration interfaces. Cabinet is a valuable workspace and UX reference because it already combines rooms, files, rich editing, agents, jobs, channels, search, Git history and embedded HTML applications. Cabinet is MIT-licensed and includes an onboarding workflow that builds an AI team from a short series of questions. citeturn10view2

Cabinet should nevertheless be used as a **frontend and workspace accelerator**, not as the canonical identity, permission or company-management backend. Its local-first and file-oriented architecture is valuable for portability but, by inference, would require substantial extension for strong multi-tenant authorization, corporate audit and transactional business data. citeturn10view2

CopilotKit and the AG-UI protocol are useful complementary technologies for integrating agents into the common frontend. CopilotKit supplies agent-aware UI and generative-interface primitives, while AG-UI defines an MIT-licensed protocol for connecting agents with interactive applications. The related Channels SDK can connect agents to human communication surfaces and approval workflows. citeturn7search0turn7search4turn7search32

**The Company Control and Context Plane** is the unique product and should remain your code. It should own:

```text
Company
Portal
Workspace
Department
Team
Role
Human principal
AI principal
Service principal
Membership
Reporting relationship
Capability
Policy
Knowledge domain
Skill definition
Agent template
Approval rule
Business process
Canonical entity
External entity mapping
```

Paperclip can provide significant functionality above this model, but the canonical company definition should not live only inside Paperclip. Paperclip is MIT-licensed and models companies, AI workforces, organizational hierarchies, goals, projects, assignments, budgets, approvals and cost controls. It is considerably closer to an AI-company management layer than a conventional agent orchestrator. citeturn10view0turn0search23

The clean ownership boundary should be:

```text
Your Company Blueprint
Defines what the company is and how it should operate
                         │
                         ▼
Paperclip
Manages goals, assignments, agents, budgets and work governance
                         │
                         ▼
Hermes
Executes the individual AI employee's work
```

Hermes is MIT-licensed and provides the reasoning and execution layer: persistent sessions, memory, skill creation, scheduled automation, subagents, multiple model providers, communication gateways and local, Docker, SSH and cloud execution backends. citeturn10view1

The Paperclip–Hermes relationship is already technically credible because an MIT-licensed adapter preserves Hermes sessions and skills while allowing Paperclip assignments and comments to trigger work. The adapter can combine Paperclip-managed organizational skills with Hermes-native runtime skills. citeturn10view4

The platform should prevent scheduling and agent-management duplication through explicit rules:

| Concern | Authoritative owner |
|---|---|
| Company goals and projects | Company Blueprint and Paperclip |
| Assignment of company work | Paperclip |
| Agent reasoning and tool execution | Hermes |
| Agent-local memory and session state | Hermes |
| Organizational skill definitions | Company Skill Registry |
| Runtime copies of approved skills | Hermes |
| Company schedules and recurring business work | Paperclip or the durable workflow layer |
| Agent-local maintenance | Hermes |
| Presentation of agents, conversations and work | Unified frontend/Cabinet-derived UI |
| Business records | The relevant ERP, CRM or application |

**The identity and policy foundation** should not be invented from scratch. Keycloak is an Apache-licensed identity and access-management system; OpenFGA is an Apache-licensed fine-grained authorization engine based on relationship modeling; and OPA is an Apache-licensed general-purpose policy engine for context-sensitive decisions. citeturn1search0turn1search1turn1search2

A practical division is:

```text
Keycloak
Who is the actor, and how did it authenticate?

OpenFGA
What company, portal, department, project or record
is the actor related to?

OPA
Under the present context and conditions,
may the actor perform this action?
```

OpenFGA can represent relationships such as a human being a member of a company, a manager of a department or a participant in a client workspace. OPA can evaluate conditions such as financial limits, data classifications, working hours, required approvals and whether an agent is acting under a valid delegation. OpenFGA implements a Zanzibar-style authorization approach, while OPA is a CNCF-graduated policy engine that has undergone security audits. citeturn1search4turn1search14

For an MVP, Keycloak and OpenFGA may be sufficient. OPA should be added when the platform begins enforcing conditional rules that cannot be expressed cleanly as relationships.

Every background agent should be represented as an attributable principal:

```text
principal_id: ai-finance-004
principal_type: ai_agent
company_id: company-a
role: accounts-receivable-assistant
manager: human-finance-director
allowed_scopes:
  - finance
  - assigned customers
allowed_capabilities:
  - erp.invoice.read
  - crm.customer.read
  - communication.draft
prohibited_capabilities:
  - erp.payment.post
  - erp.invoice.cancel
monthly_budget: ...
```

There should be no invisible global “super-agent” operating with shared administrator credentials.

## Strongest permissive building blocks by plane

The following landscape separates strong foundational candidates from projects better used as accelerators, adapters or sources of inspiration.

| Plane | Candidate | License position | Recommended role |
|---|---|---|---|
| Company and AI workforce | **Paperclip** | MIT | Organizational agent control plane: goals, projects, assignments, agent lifecycle, budgets and governance. citeturn10view0turn0search23 |
| Agent runtime | **Hermes Agent** | MIT | Primary AI employee runtime: tools, sessions, memory, skills, subagents and execution backends. citeturn10view1 |
| Workspace and unified UI | **Cabinet** | MIT | Fork selectively for rooms, files, agents, jobs, search, embedded apps and workspace UX; do not use as tenant authority. citeturn10view2 |
| Agent-native frontend | **CopilotKit and AG-UI** | MIT | Agent chat, generative UI, streaming state and human-in-the-loop interaction in the common frontend. citeturn7search0turn7search4 |
| Authentication | **Keycloak** | Apache 2.0 | Human, service and potentially AI identity authentication, federation and session management. citeturn1search0turn1search3 |
| Relationship authorization | **OpenFGA** | Apache 2.0 | Company, portal, department, project and resource entitlements. citeturn1search1turn1search4 |
| Contextual policy | **OPA** | Apache 2.0 | Conditional authorization, approvals, budget and compliance rules. citeturn1search2turn1search14 |
| Secrets | **Infisical core** | MIT outside restricted enterprise areas | Secret storage, certificates and privileged access; place behind your entitlement layer. citeturn13search2turn13search6 |
| Company knowledge reference | **GBrain** | MIT | Potential accelerator and architectural reference for institutional memory, retrieval, graph navigation and cited answers. citeturn10view3 |
| Knowledge pipelines | **Haystack** | Apache 2.0 | Controlled ingestion, retrieval, routing, RAG and answer-generation pipelines. citeturn6search1 |
| Temporal knowledge graph | **Graphiti** | Apache 2.0 | Track changing facts, relationships, effective times and provenance. citeturn6search0turn6search8 |
| Search | **OpenSearch** | Apache 2.0 | Keyword, filtered and analytical search across authorized projections. citeturn6search3turn6search7 |
| Vector retrieval | **Qdrant** | Apache 2.0 | Semantic retrieval with metadata filtering; use only when dedicated vector infrastructure is justified. citeturn6search2turn6search6 |
| Durable workflow | **Temporal** | MIT | Long-running, failure-resilient human, agent and business-system workflows. citeturn2search0turn2search16 |
| Simpler workflow alternative | **Hatchet** | MIT | PostgreSQL-oriented durable tasks, scheduling, rate limits, routing and tenant-aware execution. citeturn2search1turn2search17 |
| Complex integration | **Apache Camel** | Apache 2.0 | Protocol adapters, routing, enterprise integration patterns and difficult legacy integrations. citeturn2search2turn2search26 |
| Connector source | **Activepieces Community Edition** | MIT core; commercial enterprise directories | Adapt selected TypeScript “pieces” through your own connector contract rather than adopting its control plane. citeturn2search3turn2search7 |
| Visual integration design | **Camel Karavan** | Apache 2.0 | Source of visual-route editor patterns; potentially reusable for advanced integration administration. citeturn2search30 |
| Standards-based processes | **Flowable** | Apache 2.0 | BPMN, CMMN and DMN when customers require formal visual business-process standards. citeturn11search0turn11search15 |
| Data ingestion | **Meltano** | MIT | Singer-based extraction/load connectors for analytical ingestion rather than operational transactions. citeturn12search0turn12search3 |
| Embedded data loading | **dlt** | Apache 2.0 | Python library for typed, incremental data loading into analytical systems. citeturn12search1turn12search7 |
| Data orchestration | **Dagster** | Apache 2.0 | Data assets, lineage and analytical-pipeline observability when data complexity grows. citeturn12search2turn12search5 |
| Low-code business platform | **Frappe Framework** | MIT | Formal forms, records, workflows, permissions and generated operational modules. citeturn14search1turn14search20 |
| CRM and low-code | **Corteza** | Apache 2.0 | Permissive CRM and structured low-code business applications. citeturn14search3turn14search15 |
| Lightweight CRM | **Krayin CRM** | MIT | Laravel-based CRM candidate where a lighter conventional CRM is sufficient. citeturn3search3turn3search7 |
| Permissive ERP | **Apache OFBiz** | Apache 2.0 | Broad ERP domain engine if strict permissive licensing is mandatory. citeturn3search0turn3search20 |
| Internal app builder | **Appsmith** | Apache 2.0 | Internal tools, dashboards and API/database interfaces; generated apps need isolation and patch discipline. citeturn4search3turn4search7 |
| Office framework | **Univer** | Apache 2.0 | Embedded spreadsheets, documents and presentations with collaborative and AI-oriented extension capabilities. citeturn5search0turn5search12turn5search28 |
| Collaborative state | **Yjs** | MIT ecosystem | CRDT-based real-time collaboration for documents and structured application state. citeturn4search1turn4search17 |
| Simple document collaboration | **Etherpad** | Apache 2.0 | Lightweight collaborative text editing with revision history and plugins. citeturn5search2turn5search6 |
| Team communication | **Zulip** | Apache 2.0 | Mature topic-organized team chat if Cabinet channels are insufficient. citeturn4search0turn4search4 |
| Video meetings | **Jitsi Meet** | Apache 2.0 | Embeddable video meetings, chat, polls and screen sharing. citeturn11search2turn11search8 |
| Community knowledge | **Apache Answer** | Apache 2.0 | Internal Q&A, help center and community knowledge surface. citeturn11search1 |
| Infrastructure APIs | **Crossplane** | Apache 2.0 | Declarative control plane for cloud infrastructure and platform APIs. citeturn8search0 |
| Embedded infrastructure automation | **Pulumi Automation API** | Apache 2.0 core | Programmatic provisioning from the main application using normal programming languages. citeturn8search1turn8search9 |
| Simple application deployment | **Dokku** | MIT | Lightweight PaaS for deploying generated or customer-specific web applications. citeturn8search3 |
| Full private-cloud IaaS | **Apache CloudStack** | Apache 2.0 | Relevant only if operating virtual-machine infrastructure becomes part of the product. citeturn8search2turn8search22 |
| Object and file storage | **SeaweedFS** | Apache 2.0 | S3-compatible, scalable file and object storage without adopting an AGPL object-store dependency. citeturn13search3turn13search19 |
| BI and dashboards | **Apache Superset** | Apache 2.0 | Governed dashboards, SQL exploration and no-code visual analytics. citeturn9search0turn9search28 |
| Embedded analytics | **DuckDB** | MIT | Local or service-side analytical processing for smaller datasets and generated reports. citeturn9search1turn9search21 |
| Large-scale analytics | **ClickHouse** | Apache 2.0 | High-volume event, audit, telemetry and analytical workloads. citeturn9search2 |
| Analytical modeling | **dbt Core** | Apache 2.0 | Versioned data transformations and governed reporting models. citeturn9search3turn9search35 |
| AI observability | **Langfuse core** | MIT outside enterprise directories | LLM traces, evaluations, prompt management and debugging. citeturn13search0turn13search8turn13search24 |
| System telemetry | **OpenTelemetry Collector** | Apache 2.0 | Vendor-neutral collection and export of application and infrastructure telemetry. citeturn13search1turn13search5 |
| Agent evaluation | **Promptfoo** | MIT | Automated model, prompt and agent evaluation and red-team testing. citeturn7search3turn7search11 |
| Agent guardrails | **NeMo Guardrails** | Apache 2.0 | Programmable controls around agent inputs, outputs and interaction paths. citeturn7search2turn7search22 |

This list should not be interpreted as a recommendation to deploy every project. The architecture must deliberately avoid stacking several products that perform the same job.

The strongest starting subset is much smaller:

```text
Keycloak
OpenFGA
Paperclip
Hermes
Custom Company Blueprint
Custom unified frontend using selected Cabinet/CopilotKit concepts
Temporal
Frappe or Corteza
OpenSearch
Superset
Infisical
OpenTelemetry
```

Other components should be added only when the related requirement becomes real.

## The company bootstrap and operational lifecycle

The distinguishing capability is not simply hosting an ERP and a set of agents. It is the transformation of an incomplete business description into a governed, reviewable and deployable company model.

The process should be implemented as a **Company Compiler**.

```text
Founder prompt
     │
     ▼
Discovery and evidence collection
     │
     ▼
Research graph and company facts
     │
     ▼
Proposed Company Blueprint
     │
     ▼
Human review and risk assessment
     │
     ▼
Provisioning plan
     │
     ▼
Portals · roles · humans · agents · knowledge · apps · workflows
     │
     ▼
Evaluation and controlled activation
```

Paperclip’s Company Wizard, its catalog of ready-to-deploy agent companies and the separate Company Factory project demonstrate that prompt-driven creation of roles, workflows, skills and AI teams is already an active design pattern. These projects should be treated as accelerators and research references rather than allowed to define the canonical company schema. citeturn0search4turn0search12turn0search29

The compiler should work in controlled phases.

**Business discovery** should accept a prompt but also inspect supplied websites, documents, existing CRM/ERP exports, policies, service descriptions, organizational charts and employee lists. It should identify uncertainties instead of filling every gap with plausible text.

**External research** should collect market, competitor, regulatory, technological and operational evidence. Every retained claim should include:

```text
source
publication date
retrieval date
jurisdiction
evidence type
confidence
verification status
superseded-by relationship
```

The knowledge plane should distinguish between:

- Raw retrieved material
- Extracted factual claims
- Inferred conclusions
- Human-verified company knowledge
- Temporary agent memory
- Policies and approved procedures
- Historical or superseded knowledge

Haystack is suitable for constructing explicit retrieval and synthesis pipelines. Graphiti is useful where facts and relationships change over time. OpenSearch can provide full-text and filtered retrieval, while Qdrant may be introduced when dedicated vector search becomes necessary. citeturn6search0turn6search1turn6search2turn6search3

GBrain is closely aligned with the “company brain” concept and includes cited synthesis, graph traversal, gap analysis and access-scoped company knowledge. Its scale and leakage-resistance statements are maintainer-reported rather than independent certification, so it should initially be treated as a reference implementation or optional provider behind your knowledge interface. citeturn10view3

**Organizational design** should produce a proposed blueprint rather than directly creating production agents. A blueprint might contain:

```yaml
company:
  name: Example Compliance Services
  markets:
    - Sweden
    - European Union

departments:
  - leadership
  - sales
  - service-delivery
  - regulatory-research
  - finance
  - customer-success

roles:
  - id: managing-director
    occupier_types: [human]
  - id: regulatory-researcher
    occupier_types: [human, ai]
  - id: proposal-assistant
    occupier_types: [ai]
  - id: accounts-receivable-specialist
    occupier_types: [human, ai]

systems:
  crm: corteza
  erp: erpnext
  collaboration: native
  knowledge: company-knowledge-service

approval_policies:
  - action: send-contract
    requires: legal-human
  - action: cancel-invoice
    requires: finance-manager
```

The same role model should support both humans and AI employees. The role defines the mission, authority, responsibilities, skills, data access, reporting relationship and success metrics; the occupier determines how the work is executed.

**Skills should be versioned organizational assets**, not unreviewed prompt fragments:

```text
Draft skill
     ↓
Automated tests
     ↓
Scenario evaluation
     ↓
Human or delegated approval
     ↓
Scope assignment
     ↓
Runtime deployment
     ↓
Performance monitoring
     ↓
Revision or retirement
```

Paperclip should own the approved organizational skill assignment, while Hermes should execute a runtime copy. Hermes may discover an improved method, but that improvement should become a proposal to the central skill registry before organization-wide promotion. The existing Paperclip–Hermes adapter already supports a combination of Paperclip-managed and Hermes-native skills. citeturn10view4

Promptfoo can evaluate whether skills and agents behave correctly across realistic scenarios, while NeMo Guardrails can constrain known unsafe interaction patterns. Langfuse can trace the model and tool behavior that produced the result. citeturn7search2turn7search3turn13search8

**Agent provisioning** should create:

- A global AI principal
- A Paperclip employee record
- A Hermes profile or runtime identity
- An organizational role
- Allowed scopes
- Approved skills
- Tool capabilities
- Secret entitlements
- Budget limits
- Escalation rules
- Evaluation tests
- Reporting channels
- A responsible human manager

A provisioned agent should not be considered active until it passes role-specific evaluations.

**Background agents** should be modeled as scheduled or event-triggered employees, not as hidden automation scripts. Business schedules should originate from Paperclip or the durable process engine; Hermes should execute the assigned work. Temporal is particularly appropriate when processes contain waits, human approvals, retries and multi-system actions that may last days or months. citeturn2search0turn2search16

An example process would be:

```text
CRM opportunity becomes won
        ↓
Temporal workflow starts
        ↓
Human approval of commercial terms
        ↓
ERP customer and project created
        ↓
Paperclip assigns onboarding work
        ↓
Hermes delivery coordinator performs research
        ↓
Knowledge workspace and client portal created
        ↓
Generated onboarding report reviewed
        ↓
Client invited
```

Paperclip explains why the work exists and who owns it. Temporal guarantees the larger process survives failures and waiting periods. Hermes performs the intellectual and tool-based work.

## Business systems, office applications and generated software

The product should not claim to replace an ERP, CRM, office suite and cloud platform through one generic database. Each domain contains significant tested logic that should remain inside its appropriate service.

**ERP presents the hardest permissive-licensing tradeoff.** ERPNext is mature and comprehensive but is GPL-3.0 rather than permissively licensed. Frappe Framework—the underlying application framework—is MIT-licensed. citeturn14search4turn14search7turn14search1turn14search20

There are three realistic paths:

| ERP path | Advantages | Costs |
|---|---|---|
| ERPNext as an isolated service | Mature accounting, inventory, purchasing, manufacturing and operations | GPL obligations; should remain clearly separated through published APIs |
| Apache OFBiz | Apache 2.0 and broad ERP domain coverage | More adaptation and unified-UX work; less immediately aligned with a modern AI-first portal |
| Custom modules on Frappe Framework | MIT foundation and excellent metadata-driven app development | Recreating accounting, stock and ERP correctness would be expensive and risky |

The honest conclusion is that there is no obvious permissively licensed ERP that is simultaneously as complete, accessible and immediately usable as ERPNext. Apache OFBiz is the strongest broad permissive alternative, but it should undergo a serious domain and UX proof of concept before selection. citeturn3search0turn3search20

Using ERPNext as a separately deployed subsystem can still be commercially practical, but licensing counsel should confirm distribution, modification and source-availability obligations. The upper proprietary or differently licensed platform should communicate through stable service APIs rather than merge ERPNext code into one monolithic application.

**CRM has better permissive choices.** Twenty is attractive but its main program is AGPL with some commercially licensed files, so it does not satisfy a strict permissive-only policy. citeturn14search2

Corteza is an Apache-licensed low-code platform that can support CRM and flexible structured business applications. Krayin is an MIT-licensed Laravel CRM and may be appropriate for a lighter sales system. citeturn14search15turn3search3turn3search7

A reasonable evaluation order is:

- Corteza where metadata-driven CRM and low-code modules are priorities.
- Krayin where the team prefers Laravel and a conventional CRM is adequate.
- Twenty as an isolated optional provider if its UX and data model justify accepting AGPL boundaries.
- ERPNext CRM only where CRM requirements are simple and consolidation is more important than specialization.

The Company Control Plane must retain provider-neutral concepts such as `Organization`, `Person`, `Opportunity`, `Activity` and `Relationship`. That prevents one CRM choice from controlling the entire platform.

**Office replacement must be scoped honestly.** There is no single cleanly permissive project that reproduces the complete Microsoft 365 or Google Workspace experience, including documents, spreadsheets, presentations, email, calendar, conferencing, storage and administration.

A composable office plane is more realistic:

```text
Univer
Documents · spreadsheets · presentations

Yjs
Collaborative state and synchronization

SeaweedFS
Files and object storage

Jitsi
Meetings and screen sharing

Zulip or native channels
Team communication

External connectors
Email and calendar
```

Univer is an Apache-licensed framework for building spreadsheet, document and presentation experiences, including collaborative and AI-oriented extensions. Yjs supplies MIT-licensed CRDT technology for real-time collaboration. citeturn5search0turn5search12turn5search28turn4search1

Etherpad remains a useful simpler document editor, and Jitsi provides Apache-licensed embeddable video meetings. Zulip is a mature Apache-licensed topic-based chat system when a full collaboration backend is needed. citeturn5search2turn11search2turn4search0

La Suite Docs should not currently be treated as an unambiguously permissive candidate. Public repository material has shown conflicting MIT, MPL and optional AGPL-related licensing signals, so a file-level and build-output legal audit would be required before adoption. citeturn5search1turn5search5turn5search25

**Internal application generation should have several safety tiers.**

The first tier is **declarative views and forms**:

```text
Data entity
Fields
Relations
Validation
Layout
Permissions
Workflow
Reports
```

This is the safest and most valuable initial target. Frappe Framework is particularly strong because its metadata-driven model can produce formal records, forms, APIs and workflows. Frappe Forms can compile form definitions into real DocTypes. citeturn14search20turn14search24

The second tier is **internal dashboards and operator tools**. Appsmith is Apache-licensed and can create internal applications over databases and APIs. It should remain behind the platform’s BFF rather than receive direct unrestricted database credentials. citeturn4search3turn4search7

A 2026 stored cross-site scripting advisory affecting Appsmith v1.95 illustrates why generated application environments require strict version management, security scanning and isolation from the main portal origin. citeturn4search35

The third tier is **arbitrary generated web applications**. Those should be packaged, scanned, tested and deployed into an isolated runtime with:

- A separate origin
- No access to portal cookies
- Explicit capability APIs
- Signed manifests
- Network restrictions
- Resource limits
- Database isolation
- Versioning
- Human approval
- Rollback

Dokku can support simple PaaS-style deployment of generated applications. Pulumi’s Automation API can provision infrastructure programmatically from the main application, while Crossplane becomes relevant when the platform needs declarative Kubernetes-native cloud APIs. citeturn8search3turn8search9turn8search0

Apache CloudStack is useful only if the company intends to operate its own IaaS cloud or sell virtual-machine infrastructure. It would be excessive for merely deploying internal micro-applications. citeturn8search2turn8search22

**Analytics should operate over governed projections, not directly across every production database.**

An effective progression is:

```text
Initial
PostgreSQL read models + DuckDB + Superset

Growing
dbt Core models + dedicated analytical storage

High volume
ClickHouse for events, traces and operational analytics
```

DuckDB is an MIT-licensed embedded analytical database, Superset is an Apache-licensed BI and exploration platform, dbt Core provides Apache-licensed versioned transformations, and ClickHouse is an Apache-licensed real-time analytical database. citeturn9search0turn9search1turn9search2turn9search3

AI-generated reports should cite the analytical model, query, data timestamp and source systems used. The agent should not be able to silently present a cached CRM projection as the current accounting truth.

## What should be built, adapted and deliberately avoided

The product’s durable value lies in a relatively narrow but strategically important set of capabilities.

**Build and own these components:**

| Component | Why it must be yours |
|---|---|
| Company Blueprint schema | No adopted subsystem fully represents the company you intend to create |
| Company Compiler | This is the differentiating prompt-to-company capability |
| Global tenant and portal model | Must span every subsystem |
| Human, AI and service-principal model | Must provide one attribution model across the platform |
| Scope and context service | Personal, department, project, client and channel contexts must behave consistently |
| Company policy contract | Paperclip, Hermes, ERP, CRM and integrations must receive consistent decisions |
| Canonical entity and mapping service | Prevents system-specific IDs from becoming the company identity |
| Unified BFF/API | Keeps the frontend independent from subsystem APIs |
| Unified frontend shell | Makes the composed system feel like one product |
| Skill registry and approval lifecycle | Separates approved corporate methods from agent-local experimentation |
| Integration control plane | Connections, connector registry, flows, mappings and runs need company-level governance |
| Application manifest and deployment governance | Generated applications must be reviewable and revocable |
| Cross-system audit correlation | One business action may cross many services |
| Evaluation and AI-employment lifecycle | AI employees need onboarding, testing, review and termination |

**Adopt mature infrastructure rather than rebuilding it:**

- Keycloak for authentication.
- OpenFGA for relationship-based entitlements.
- OPA when contextual policy complexity requires it.
- Temporal for durable long-running workflows.
- Infisical for secrets, subject to confirming which required features are inside the MIT portion.
- OpenTelemetry for system traces.
- OpenSearch for search.
- Superset for business intelligence.
- Pulumi or Crossplane for infrastructure provisioning.
- SeaweedFS for permissively licensed object storage. citeturn1search0turn1search1turn1search2turn2search0turn13search2turn13search5turn6search3turn9search0turn8search0turn13search3

**Adapt and keep replaceable:**

- Paperclip as the organizational AI workforce provider.
- Hermes as the AI runtime provider.
- Cabinet as workspace and frontend source.
- GBrain as a company-knowledge accelerator.
- Activepieces pieces as connector source.
- Frappe or Corteza as generated-business-app providers.
- Appsmith as an internal-tool provider.
- Langfuse as the AI-observability provider.

These projects are useful precisely because they reduce development effort. They should still be wrapped behind interfaces such as:

```text
WorkforceProvider
AgentRuntimeProvider
WorkspaceProvider
KnowledgeProvider
ERPProvider
CRMProvider
IntegrationRuntimeProvider
ApplicationBuilderProvider
SearchProvider
AnalyticsProvider
InfrastructureProvider
```

This makes it possible to replace a provider without recreating every department, role or customer portal.

**Avoid one universal operational database.**

The recommended model is:

```text
Company Core Database
├── companies
├── portals
├── principals
├── departments
├── roles
├── memberships
├── scopes
├── capabilities
├── policies
├── skills
├── canonical entities
└── external mappings

Subsystem Databases
├── Paperclip database
├── Hermes runtime state
├── workspace/document state
├── ERP database
├── CRM database
└── integration workflow state

Derived Data
├── search indexes
├── vector indexes
├── analytical models
└── audit/event projections
```

The same customer may have an ERP customer ID, a CRM company ID, a document-workspace ID and a portal identity. The canonical entity service records that all four refer to the same real-world organization.

Useful data duplication remains necessary:

- ERP owns the authoritative invoice.
- CRM may display a read projection of invoice status.
- Search indexes the invoice’s authorized searchable fields.
- Analytics stores a reporting projection.
- A Hermes session may temporarily include a summary.
- A channel may contain a reference.

Only one copy is authoritative. The other copies are controlled projections.

**Avoid direct cross-database writes.** All transactional changes should use the owning system’s service API so its permissions, validation, hooks, accounting logic and workflows remain active.

**Avoid multiple agent control loops.** Cabinet, Paperclip and Hermes can all contain adjacent scheduling or agent features. The correct deployment disables or bypasses overlapping execution paths:

```text
Paperclip assigns.
Hermes executes.
Cabinet presents.
Temporal coordinates cross-system processes.
```

**Avoid adopting both Temporal and Hatchet initially.** Temporal is the more conservative choice for long-lived, business-critical workflows. Hatchet is attractive if a smaller team values a simpler PostgreSQL-centric architecture and built-in rate or concurrency controls. Both should sit behind your `WorkflowRuntimeProvider`. citeturn2search0turn2search1

**Avoid adding Flowable unless BPMN, CMMN or DMN is a customer-facing requirement.** Running Flowable and Temporal for the same workflows would create two process authorities. Flowable becomes valuable only when standards-based visual process modeling is itself part of the product. citeturn11search0turn11search15

**Separate operational integrations from analytical ingestion.**

- Temporal and connector workers should manage business transactions and cross-system processes.
- Meltano and dlt should move data into analytical stores.
- Dagster should be introduced when data assets, lineage and pipeline operations require a dedicated platform. citeturn12search0turn12search1turn12search2

**Treat permissive open-core boundaries carefully.** Activepieces, Infisical and Langfuse license their open cores permissively while placing specified enterprise directories or capabilities under separate terms. The selected build must be audited at the file, package and container-image level rather than relying on a repository badge. citeturn2search7turn13search0turn13search2

ERPNext and Twenty are open source but not permissively licensed: ERPNext is GPL-3.0, while Twenty primarily uses AGPL with some commercially licensed files. They should be classified separately from the strict-permissive core and reviewed as isolated optional services. citeturn14search7turn14search2

## Recommended reference stack and delivery path

The following is the most balanced reference architecture based on functional fit, licensing, maturity and avoidance of duplication.

| Responsibility | Recommended default | Alternative |
|---|---|---|
| Main application and portal | Custom React/Next-style product shell using selected Cabinet and CopilotKit patterns | A controlled Cabinet fork |
| Authentication | Keycloak | Existing customer identity provider through federation |
| Relationship authorization | OpenFGA | Custom relationship layer only for a very limited MVP |
| Contextual policies | OPA after policy complexity emerges | Application-level policy code initially |
| Company Blueprint | Custom | None |
| Workforce governance | Paperclip behind an adapter | Custom organization/work service |
| Agent runtime | Hermes behind an adapter | Other harnesses through the same provider interface |
| Company knowledge | Custom governance service using Haystack and OpenSearch | GBrain provider; Graphiti for temporal graph needs |
| Vector retrieval | OpenSearch vector features initially | Qdrant when dedicated vector performance warrants it |
| Durable workflow | Temporal | Hatchet |
| Connector SDK | Custom typed connector contract | Activepieces compatibility adapter |
| Complex protocols | Apache Camel only when needed | Native connectors |
| Secrets | Infisical core plus your entitlement service | Cloud KMS/secrets services |
| Structured business apps | Frappe Framework | Corteza |
| ERP | ERPNext as isolated GPL service | Apache OFBiz for strict permissive deployment |
| CRM | Corteza | Krayin; Twenty as isolated AGPL option |
| Documents and spreadsheets | Univer + Yjs | Etherpad for simpler documents |
| Team chat | Native portal channels or Zulip | Cabinet channels for initial deployments |
| Meetings | Jitsi | External conferencing connectors |
| Generated internal tools | Declarative form renderer + Frappe | Appsmith in an isolated environment |
| Generated web-app deployment | Dokku initially | Pulumi/Crossplane-managed Kubernetes |
| Object storage | SeaweedFS | Customer cloud object storage |
| Search | OpenSearch | Specialized provider later |
| Business intelligence | Superset | Custom dashboards |
| Analytical processing | DuckDB initially | ClickHouse at scale |
| AI observability | Langfuse core | Custom OpenTelemetry-backed traces |
| General telemetry | OpenTelemetry Collector | Cloud-specific observability exporters |
| AI evaluation | Promptfoo | Custom scenario runner |
| Guardrails | NeMo Guardrails for applicable paths | Policy-specific custom checks |

The delivery should proceed in capability slices rather than attempting to integrate every subsystem before validating the company model.

**The foundation slice** should establish:

```text
Company
Portal
Human principal
AI principal
Role
Department
Membership
Scope
Capability
Canonical entity
Audit correlation ID
```

Keycloak and OpenFGA should be integrated before the system begins provisioning customer data. OPA can follow when contextual policies become too complex for application logic.

**The company-creation slice** should implement:

```text
Prompt
     ↓
Research plan
     ↓
Evidence store
     ↓
Draft Company Blueprint
     ↓
Human review
     ↓
Provision Paperclip organization
     ↓
Provision Hermes agents
     ↓
Create portal workspaces and knowledge domains
```

Paperclip’s Company Wizard and Company Factory can accelerate the design, but your versioned Company Blueprint remains authoritative. citeturn0search12turn0search29

**The first operational slice** should support one complete business process rather than dozens of disconnected demonstrations. A suitable example is:

```text
Lead
  ↓
Qualification
  ↓
Proposal
  ↓
Human approval
  ↓
Customer creation
  ↓
Project onboarding
  ↓
AI-generated research and plan
  ↓
Invoice
  ↓
Status report
```

This validates CRM, ERP, Paperclip, Hermes, knowledge, approvals, workflow reliability and the unified interface in one coherent scenario.

**The application-building slice** should initially permit only declarative modules:

- Forms
- Tables
- Relations
- Dashboards
- Reports
- Workflows
- Permissions

Arbitrary AI-generated application code should be introduced only after the platform has isolated deployment origins, security scanning, capability manifests, rollback and approval controls.

**The analytics slice** should build read models and dashboards from events and system APIs rather than grant reporting agents direct access to every operational database.

**The expansion slice** can later add:

- More CRM and ERP providers
- Customer-specific connectors
- Office applications
- Cloud provisioning
- Industry company packs
- Agent marketplace capabilities
- Portable company blueprints
- Partner-developed skills and connectors

The final architectural decision is:

> **Do not search for one platform that already is the complete AI Company OS. Use mature permissive infrastructure for identity, policy, workflows, search, data and cloud operations; use emerging AI-native projects as replaceable accelerators; and build the company-defining layer as the permanent core product.**

The highest-value original assets will be:

- The Company Blueprint and compiler
- The shared human/AI role model
- The scope and policy architecture
- The skills and evaluation lifecycle
- The unified company experience
- The canonical data and integration contracts
- The secure application-generation environment
- The industry-specific company templates

Paperclip, Hermes, Cabinet, Frappe, Corteza, Temporal, Camel, Univer, Superset and the other projects can substantially reduce engineering effort. None of them should be allowed to dictate the entire platform’s identity, tenancy, business ontology or long-term evolution.