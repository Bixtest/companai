# Universal Application Platform — Foundational Framework Blueprint

**Document type:** Foundational architecture / platform specification
**Status:** Architecture baseline for implementation and further refinement
**Date:** 2026-10-06
**Scope:** General-purpose, AI-native, multi-tenant application platform capable of supporting everything from internal tools and data visualization to SaaS, ERP, CRM, workflow systems, data platforms, AI systems, and very large integrated enterprise platforms.

---

## 0. Executive Definition

The target is not merely a reusable software framework and not an ERP with many modules.

The target is a:

> **Metadata-driven, multi-tenant, policy-aware, event-driven, workflow-native, API-first, AI-native application platform.**

The platform should make any application that can be expressed through **data + relationships + state + actions + policies + workflows + views + integrations + analytics + AI** composable without rebuilding the underlying infrastructure.

The central design principle is:

> **Everything that can be described declaratively should be declarative.**

Code remains available for novel algorithms, infrastructure, specialized integrations, high-performance workloads, specialized rendering, and other cases where declarative primitives are insufficient.

The platform should support three equivalent construction modes:

1. **Code-first** — engineers use SDKs and APIs.
2. **Declarative** — builders construct application metadata/specifications.
3. **AI-first** — AI translates natural-language requirements into the same application specifications.

All three modes must converge on the same runtime model.

---

# 1. Core Architectural Thesis

The universal application model should reduce almost every product capability to a relatively small set of primitives.

## 1.1 The 18 irreducible primitives

| Primitive | Purpose |
|---|---|
| **Actor** | Who interacts with the system |
| **Tenant** | Organizational/security boundary |
| **Resource** | What exists in the system |
| **Schema** | Shape and meaning of a resource |
| **Relationship** | How resources connect |
| **State** | Current lifecycle condition |
| **Action** | Something an actor/system/agent can do |
| **Command** | Intent to change state |
| **Event** | A fact that something happened |
| **Policy** | What an actor is allowed to do |
| **Rule** | What the system should do under conditions |
| **Workflow** | Coordinated multi-step behavior |
| **Query** | Retrieve/transform data |
| **View** | Present data or operations |
| **Artifact** | File, content, output, or generated object |
| **Integration** | Connection to another system |
| **Context** | Execution environment and identity context |
| **Definition / Metadata** | Machine-readable description of the above |

Everything else should be built from these primitives wherever practical.

## 1.2 Compositional examples

```text
Resource + Schema
    -> database-backed entity

Resource + View
    -> CRUD application

Resource + Query + View
    -> data explorer

Query + Metric + View
    -> BI dashboard

Resource + Workflow
    -> business process

Resource + Policy
    -> secure enterprise application

Event + Workflow
    -> automation

Resource + API + Integration
    -> SaaS integration

Resource + Tool + Agent
    -> AI agent

Everything together
    -> ERP / CRM / enterprise platform
```

---

# 2. Target System Topology

The conceptual stack should be:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATIONS / DOMAIN PACKS                    │
│ ERP · CRM · HR · Finance · CMS · BI · AI · Commerce · IoT · LMS  │
├─────────────────────────────────────────────────────────────────────┤
│                       EXPERIENCE / UI RUNTIME                       │
│ Pages · Forms · Tables · Dashboards · Workspaces · Mobile · Chat  │
├─────────────────────────────────────────────────────────────────────┤
│                         APPLICATION LOGIC                           │
│ Actions · Commands · Rules · Policies · State Machines             │
├─────────────────────────────────────────────────────────────────────┤
│                      EVENT / WORKFLOW FABRIC                        │
│ Events · Queues · Jobs · Schedules · Durable Workflows · Sagas    │
├─────────────────────────────────────────────────────────────────────┤
│                       INTEGRATION FABRIC                            │
│ REST · GraphQL · gRPC · OpenAPI · AsyncAPI · Webhooks · MCP       │
├─────────────────────────────────────────────────────────────────────┤
│                           DATA FABRIC                               │
│ OLTP · Files · Search · Vector · Time Series · Graph · OLAP       │
├─────────────────────────────────────────────────────────────────────┤
│                     SECURITY / CONTROL PLANE                        │
│ IAM · Tenancy · RBAC · ABAC · ReBAC · Secrets · Audit · Policies │
├─────────────────────────────────────────────────────────────────────┤
│                       META-MODEL ENGINE                             │
│ Schemas · Types · Relationships · Lifecycles · Registries          │
├─────────────────────────────────────────────────────────────────────┤
│                         PLATFORM CORE                               │
│ Runtime · API Gateway · Cache · Messaging · Config · Observability│
├─────────────────────────────────────────────────────────────────────┤
│                       INFRASTRUCTURE                                │
│ Compute · Containers · Networking · Databases · Object Storage    │
└─────────────────────────────────────────────────────────────────────┘
```

The platform should be thought of as three major planes:

### Control Plane

Contains identity, tenancy, metadata, policy, configuration, governance, applications, environments, plugins, deployment, entitlements and platform operations.

### Data Plane

Contains transactional records, files, events, search, analytical data, vectors, queries and AI retrieval/context.

### Experience Plane

Contains web applications, mobile experiences, admin interfaces, customer portals, embedded experiences, dashboards, APIs, CLI and AI interfaces.

---

# 3. Meta-Model: The Most Important Layer

The meta-model is the vocabulary by which applications describe themselves.

Do not begin by creating hundreds of domain-specific tables. First define the model that allows applications to define their own entities, workflows, interfaces and policies.

## 3.1 Resource model

Every important platform object should be modeled as a resource.

Conceptual resource envelope:

```json
{
  "id": "...",
  "type": "...",
  "tenant_id": "...",
  "namespace": "...",
  "version": 7,
  "status": "active",
  "owner": "...",
  "created_at": "...",
  "created_by": "...",
  "updated_at": "...",
  "updated_by": "...",
  "labels": {},
  "metadata": {},
  "data": {}
}
```

The exact storage implementation may vary, but the conceptual envelope should remain consistent.

### Generic resource capabilities

- identity
- ownership
- tenancy
- metadata
- lifecycle
- relationships
- versioning
- permissions
- audit
- tags/labels
- timestamps
- provenance
- lineage
- references

## 3.2 Resource categories

Resources should include, at minimum:

- business entities
- documents
- files
- media
- tasks
- cases
- tickets
- projects
- transactions
- workflows
- workflow instances
- jobs
- events
- APIs
- connectors
- integrations
- dashboards
- reports
- charts
- pages
- forms
- views
- queries
- saved searches
- policies
- rules
- roles
- permissions
- agents
- tools
- prompts
- models
- datasets
- metrics
- alerts
- notifications
- environments
- deployments
- features
- configurations
- credentials
- secrets references
- applications
- packages/plugins
- evaluation datasets
- AI traces/runs

---

# 4. Actor / Identity Model

The platform must treat actors as a universal concept.

## 4.1 Actor types

- Human user
- Administrator
- Service account
- API client
- Machine/service
- AI agent
- Device
- External organization
- External person
- Team
- Group
- Tenant
- Workspace
- Anonymous/public actor

## 4.2 Actor attributes

- globally unique identity
- tenant membership
- organization membership
- groups
- roles
- permissions/capabilities
- locale
- timezone
- language preference
- notification preferences
- UI preferences
- session state
- device/session context
- account status
- authentication methods
- external identities

---

# 5. Tenancy / Organization / Workspace Model

Multi-tenancy is a foundational property, not a feature added later.

Recommended hierarchy:

```text
Platform
  └── Environment
       └── Organization
            └── Tenant
                 └── Workspace
                      └── Users / Groups
                           └── Resources
```

The hierarchy may be adapted for different products, but the concepts should exist independently.

## 5.1 Isolation modes

Support:

### Pool

Shared infrastructure with logical tenant separation.

### Bridge

Shared platform with stronger component-level or data-level isolation.

### Silo

Dedicated database, compute or full stack for an enterprise tenant.

A tenant should be able to move between isolation classes without redesigning the application model.

## 5.2 Tenant-aware requirements

Every tenant-sensitive operation must account for:

- tenant identity
- organization identity
- workspace identity
- data scope
- policy scope
- quotas
- billing/entitlements
- locale
- branding
- configuration
- storage boundaries
- audit boundaries
- residency requirements

---

# 6. Identity and Access Management (IAM)

## 6.1 Authentication

Support:

- username/password
- MFA
- TOTP
- passkeys/WebAuthn
- OIDC
- OAuth 2.x
- SAML
- magic links
- email verification
- service accounts
- API keys
- machine identities
- directory-backed authentication

## 6.2 Enterprise identity lifecycle

- domain verification
- JIT provisioning
- SCIM provisioning/deprovisioning
- group synchronization
- role mapping
- directory synchronization
- session management
- device/session controls
- account recovery
- account suspension
- credential rotation

---

# 7. Authorization Model

Authorization must be enforced beneath the UI.

Hiding a button is not a security mechanism.

## 7.1 Required authorization dimensions

The platform should support a combination of:

- RBAC — role-based access control
- ABAC — attribute-based access control
- ReBAC — relationship-based access control
- capability-based access
- resource-level authorization
- record-level authorization
- field-level authorization
- action-level authorization
- tenant-level authorization
- organization-level authorization
- workspace-level authorization
- ownership-based authorization
- hierarchy-based authorization
- time/context-based authorization
- environment-specific authorization
- delegated access
- temporary access
- approval-gated access

## 7.2 Canonical policy question

Every protected action ultimately becomes:

```text
WHO
can perform WHAT
on WHICH RESOURCE
under WHICH CONDITIONS
in WHICH CONTEXT?
```

## 7.3 AI inherits authorization

AI agents must use exactly the same authoritative authorization system as humans and APIs.

No agent should be able to retrieve or mutate information that its effective identity/context cannot access.

---

# 8. Schema and Data Model Engine

## 8.1 Primitive types

- string
- text
- integer
- decimal
- float
- boolean
- date
- datetime
- time
- duration
- UUID
- enum
- money
- currency
- percentage
- quantity
- unit
- URI/URL
- email
- phone
- IP
- hash
- JSON
- binary
- geographic point
- geographic line
- geographic polygon

## 8.2 Compound types

- object
- record
- collection/list
- set
- map
- tuple
- union
- nullable
- reference
- polymorphic reference

## 8.3 Relationship types

- one-to-one
- one-to-many
- many-to-one
- many-to-many
- parent/child
- ownership
- dependency
- membership
- hierarchy
- composition
- inheritance
- temporal relationship
- graph edge

## 8.4 Schema features

- defaults
- validation
- requiredness
- uniqueness
- constraints
- indexes
- generated values
- formulas
- computed fields
- derived fields
- enumerations
- localization
- descriptions
- documentation
- deprecation
- versioning
- migration rules
- data classification
- retention

JSON Schema should be supported as a machine-readable schema/validation interchange format where appropriate.

---

# 9. Universal Data Containers

The platform should provide standard logical containers for multiple classes of workload.

## 9.1 Business data containers

- Table
- Entity
- Collection
- Record
- Aggregate
- Transaction
- Ledger
- Journal
- Snapshot
- Version
- Revision
- State
- Timeline
- Hierarchy
- Tree
- Graph

## 9.2 Analytical containers

- Dataset
- Source
- Fact
- Dimension
- Metric
- Measure
- Semantic model
- Cube
- Cohort
- Segment
- Time series
- Materialized view
- Analytical snapshot

## 9.3 Content containers

- Document
- Page
- Section
- Block
- File
- Image
- Video
- Audio
- Attachment
- Archive
- Folder
- Knowledge article

## 9.4 Operational containers

- Job
- Task
- Work item
- Queue
- Case
- Ticket
- Incident
- Run
- Execution
- Workflow instance
- Approval
- SLA

## 9.5 Integration containers

- External system
- Connection
- Connector
- Credential reference
- Webhook
- API
- Endpoint
- Subscription
- Mapping
- Transformation
- Sync job
- Sync cursor
- External object
- Import batch
- Export batch

## 9.6 AI containers

- Conversation
- Message
- Prompt
- Prompt template
- Agent
- Agent run
- Tool
- Tool call
- Context
- Memory
- Knowledge source
- Retrieval result
- Embedding
- Vector
- Model
- Model deployment
- Evaluation
- Evaluation dataset
- Guardrail
- Human approval
- Agent plan
- Agent task

## 9.7 Governance containers

- Policy
- Rule
- Permission
- Role
- Capability
- Entitlement
- Approval policy
- Data classification
- Retention policy
- Compliance control
- Audit record
- Consent
- Legal hold

---

# 10. Resource Lifecycle and State Machines

Every significant business resource should support a metadata-defined lifecycle.

Example:

```text
draft -> submitted -> approved -> active -> completed -> archived
                 \-> rejected
```

The state-machine engine should support:

- allowed transitions
- transition permissions
- preconditions
- validators
- required fields per transition
- actions
- events
- notifications
- workflow triggers
- timers
- escalation
- history
- rollback/compensation where applicable
- versioning

This turns the same engine into CRM pipelines, ERP approvals, ticketing, case management, content publishing and project state models.

---

# 11. Business Rule Engine

The rule engine must be independent of UI code.

Support:

- validation rules
- calculated fields
- derived values
- conditional visibility
- conditional requiredness
- defaulting
- routing
- eligibility
- approval rules
- pricing rules
- threshold rules
- SLA rules
- escalation rules
- fraud/anomaly rules
- data quality rules
- compliance rules
- AI guardrail rules

Conceptual expression model:

```text
IF / WHEN / UNLESS
AND / OR / NOT
THEN / ELSE
```

Rule evaluation must be:

- deterministic where possible
- versioned
- testable
- traceable
- explainable
- permission-aware
- tenant-aware
- locale-aware when applicable

---

# 12. Universal Command Model

A **command** represents an intent to change state.

Examples:

```text
CreateCustomer
ApproveInvoice
MoveInventory
AssignTask
PublishArticle
GenerateReport
DeployApplication
```

The command pipeline should be:

```text
intent
  -> identity/context
  -> authorization
  -> validation
  -> transaction
  -> state change
  -> event
  -> workflow/side effects
  -> audit
```

Commands must define:

- input schema
- output schema
- permissions
- preconditions
- side effects
- idempotency behavior
- transaction semantics
- emitted events
- risk classification
- approval requirement
- observability

---

# 13. Universal Action Model

An action is an executable capability that can be reused by different interfaces.

A single action must be invokable by:

- web UI
- mobile UI
- API
- CLI
- workflow
- event handler
- scheduled job
- integration
- AI agent
- automation

Action definition should include:

```text
name
description
input schema
output schema
permissions
preconditions
side effects
events
idempotency
risk level
approval requirement
```

This prevents business logic from being duplicated across UI, APIs, workflows and AI.

---

# 14. Universal Event Model

Events represent facts rather than intentions.

Examples:

```text
customer.created
customer.updated
invoice.created
invoice.submitted
invoice.approved
invoice.paid
stock.moved
project.task.assigned
article.published
agent.completed
```

Event envelope should contain:

- event ID
- event type
- event version
- timestamp
- actor
- tenant
- resource ID
- correlation ID
- causation ID
- trace ID
- payload
- schema version
- source

Use CloudEvents as the interoperability model where appropriate.

---

# 15. Event and Messaging Fabric

Support:

- queues
- pub/sub
- streams
- consumer groups
- delayed delivery
- scheduled events
- subscriptions
- filtering
- routing
- transformation
- ordering policies
- retries
- dead-letter queues
- deduplication
- idempotency
- replay
- backpressure
- consumer health

Event infrastructure should be decoupled from application modules.

---

# 16. Transaction and Distributed Consistency Layer

Differentiate between:

### Local ACID transaction

A database transaction across a bounded unit of work.

### Distributed business transaction

A multi-system or multi-service operation.

For distributed work, support:

- idempotency keys
- transactional outbox
- inbox/deduplication
- retries
- exponential backoff
- timeouts
- sagas
- compensation
- reconciliation
- recovery
- explicit failure states

The platform must never silently duplicate externally visible side effects after retries.

---

# 17. Durable Workflow Engine

Workflow is a first-class platform service.

Canonical structure:

```text
Trigger
  -> Step
  -> Condition
  -> Branch
  -> Action
  -> Wait
  -> Human Approval
  -> External Event
  -> Retry
  -> Compensation
  -> Continue
  -> Complete
```

Support:

- event-triggered workflows
- schedule-triggered workflows
- API-triggered workflows
- human workflows
- approval workflows
- long-running workflows
- background jobs
- parallel branches
- conditional branches
- loops
- retries
- timeouts
- compensation
- escalations
- SLAs
- pause/resume
- cancellation
- versioning
- migration of running workflows
- replay/recovery

The workflow engine should provide durable state, timers and deterministic recovery.

---

# 18. Scheduler

First-class scheduling must support:

- one-time execution
- intervals
- cron-like schedules
- calendar rules
- delayed execution
- recurring schedules
- event-triggered execution
- dependency-triggered execution
- time-zone-aware execution
- tenant-local schedules
- blackout periods
- business-day calendars

Used by reports, invoices, synchronization, backups, data jobs, maintenance, AI agents, notifications and renewals.

---

# 19. Query Engine

UI and business modules should not have to know which physical storage engine is behind a query.

Universal query model:

```text
source
select / projection
filter
join
aggregate
group
sort
paginate
search
calculate
window
calendar/time range
permissions
```

Query compilation may target:

- SQL
- search engine queries
- GraphQL
- external APIs
- analytical engines
- connector-native query APIs

The same logical query should be consumable by:

- tables
- charts
- dashboards
- APIs
- exports
- reports
- workflows
- AI answers

---

# 20. Semantic Analytics Layer

A governed semantic layer should be a core platform service.

Define metrics once:

```text
Metric
  ├── definition
  ├── formula
  ├── dimensions
  ├── filters
  ├── time semantics
  ├── permissions
  ├── lineage
  ├── owner
  └── version
```

Examples:

- revenue
- gross margin
- active customer
- churn
- conversion rate
- inventory turnover
- utilization
- SLA compliance

The same semantic definition must feed dashboards, reports, APIs and AI so different interfaces do not produce different definitions of the same metric.

---

# 21. Data Visualization Engine

Charts should be declarative, not bespoke components tied to one screen.

Support:

### Basic

- KPI
- number
- table
- bar
- column
- line
- area
- pie
- donut

### Advanced

- scatter
- bubble
- histogram
- box plot
- waterfall
- funnel
- gauge
- heatmap
- treemap
- sunburst
- Sankey
- radar
- candlestick
- cohort
- retention
- Pareto

### Spatial

- map
- point map
- choropleth
- route map
- geofence

### Structural

- graph
- network
- tree
- hierarchy
- timeline
- Gantt

### Operational

- status board
- alert panel
- trace visualization
- log viewer
- live monitoring

Visualization should separate:

```text
data
-> query
-> transformation
-> semantic definition
-> visualization specification
-> presentation
```

Vega-Lite-style declarative visualization is an appropriate conceptual reference for this separation.

---

# 22. Universal View Model

Do not couple UI directly to a database table.

A view should be a metadata object:

```text
View
  ├── resource/query source
  ├── selected fields
  ├── layout
  ├── filters
  ├── sorting
  ├── grouping
  ├── actions
  ├── permissions
  ├── responsive rules
  ├── localization
  └── presentation
```

One resource can therefore support:

- list view
- table/grid view
- form view
- detail view
- card view
- kanban view
- calendar view
- timeline view
- chart view
- map view
- dashboard view
- mobile view
- AI view

---

# 23. Universal UI / Design System

The platform should have a first-class design system, not a loose component collection.

## 23.1 Design tokens

Tokens should exist for:

- color
- typography
- spacing
- sizing
- border
- radius
- elevation
- shadow
- motion
- duration
- easing
- opacity
- z-index/layering
- breakpoints
- density
- iconography
- focus indicators

Use a machine-readable token model that can be transformed into platform-specific representations.

## 23.2 Atomic UI primitives

### Typography

- display
- heading levels
- body
- labels
- captions
- code
- links

### Inputs

- text input
- textarea
- number
- currency
- date
- date-time
- time
- email
- phone
- URL
- password
- search
- file upload
- rich text
- color

### Selection

- checkbox
- radio
- switch
- select
- multiselect
- combobox
- autocomplete
- chips/tags

### Navigation

- global navigation
- sidebar
- breadcrumbs
- tabs
- stepper
- pagination
- command palette
- menu
- context menu

### Feedback

- toast
- alert
- banner
- tooltip
- progress
- skeleton
- spinner
- empty state
- error state
- success state

### Containers

- card
- panel
- section
- modal
- dialog
- drawer
- sheet
- popover
- dropdown
- split pane

---

# 24. Advanced Enterprise UI Elements

## 24.1 Data interfaces

- data table
- enterprise data grid
- editable grid
- grouped grid
- tree grid
- pivot table
- master/detail
- related record lists
- inline editing
- bulk actions
- column chooser
- saved views
- saved filters
- advanced filter builder
- grouping
- aggregation
- export
- import
- row selection
- mass update

## 24.2 Business interfaces

- approval inbox
- task queue
- work queue
- case workspace
- customer 360
- activity timeline
- audit timeline
- status board
- kanban
- calendar
- scheduling board
- resource planner
- dispatch board
- workflow designer
- form builder
- page builder

## 24.3 Content interfaces

- rich text editor
- markdown editor
- document viewer
- PDF viewer
- image viewer
- media player
- file manager
- attachment panel
- comments
- mentions
- annotations
- version history
- collaborative editor

## 24.4 Analytics interfaces

- KPI cards
- dashboards
- chart panels
- pivot
- cohort
- funnel
- maps
- drill-down
- cross-filtering
- comparison
- time-range controls
- anomaly indicators
- threshold overlays

## 24.5 AI interfaces

- chat
- assistant panel
- copilot
- agent workspace
- tool execution panel
- action confirmation
- human approval panel
- AI explanation
- citations/source panel
- generated-form preview
- suggested actions
- AI status/progress
- prompt/context editor
- AI-generated content editor

---

# 25. UX Foundations and Interaction Standards

The platform should treat UX as a system-level concern.

## 25.1 Core UX principles

Every application generated on top of the framework should default to:

- clarity over decoration
- predictable navigation
- visible system status
- immediate feedback
- reversible actions where possible
- progressive disclosure
- recognition over recall
- consistent interaction patterns
- minimal unnecessary cognitive load
- strong error prevention
- clear error recovery
- explicit destructive-action confirmation
- preservation of user context
- keyboard accessibility
- sensible focus management
- mobile/touch suitability
- responsive adaptation
- performance-conscious interaction

## 25.2 UX flow integrity

Every user journey should have explicit states:

```text
Entry
 -> Loading
 -> Ready
 -> Input
 -> Validation
 -> Submit
 -> Processing
 -> Success
```

and failure paths:

```text
Error
 -> Explain
 -> Recover
 -> Retry / Undo / Cancel / Contact support
```

Required flow categories include:

- first-time use
- returning use
- empty state
- partial data
- loading state
- error state
- permission denial
- offline state
- synchronization conflict
- validation failure
- long-running operation
- destructive action
- cancellation
- undo
- timeout
- session expiration
- concurrent edit

No screen should be considered complete without defining its meaningful states and transitions.

## 25.3 Form UX standard

Forms should support:

- semantic field labeling
- inline validation
- server-side validation
- clear required indicators
- sensible defaults
- input constraints
- field dependencies
- conditional sections
- autosave where appropriate
- draft state
- unsaved-change warning
- error summary for long forms
- focus-to-error
- keyboard navigation
- accessible descriptions
- confirmation for destructive operations

## 25.4 Data-grid UX standard

Enterprise data grids should support:

- stable column widths
- resize/reorder
- pinning
- sorting
- grouping
- filtering
- faceting
- virtualization
- keyboard navigation
- row selection
- bulk actions
- saved views
- responsive fallback
- mobile-specific alternative presentation
- accessible headers and relationships

## 25.5 Navigation UX standard

Navigation should distinguish:

- global navigation
- application navigation
- workspace navigation
- contextual navigation
- record navigation

Support:

- breadcrumbs
- deep links
- browser history
- command palette
- contextual actions
- URL-addressable state where appropriate
- predictable Back behavior

---

# 26. Responsive Design System

Responsiveness is a platform primitive, not a CSS afterthought.

## 26.1 Responsive requirements

Every generated interface must have explicit behavior for at least:

- compact/mobile
- tablet/intermediate
- desktop
- wide desktop

Do not design only for named devices. Use content-driven breakpoints and fluid layouts.

## 26.2 Responsive principles

- mobile-first defaults where appropriate
- fluid sizing
- container-based adaptation
- content-driven breakpoints
- responsive typography
- responsive spacing
- adaptive navigation
- touch-friendly controls
- flexible tables/grids
- responsive dialogs
- responsive charts
- responsive media
- overflow handling
- horizontal scrolling only when genuinely necessary
- alternate presentation for dense enterprise interfaces

Prefer CSS logical properties and container queries for component-level adaptability where supported.

## 26.3 Responsive component contract

Every reusable component should declare:

```text
minimum viable width
preferred width
maximum width
reflow behavior
collapse behavior
overflow behavior
visibility rules
interaction changes
keyboard behavior
touch behavior
```

## 26.4 Responsive application behavior

Examples:

```text
Desktop table
    -> compact table
    -> card/list representation on narrow screens

Desktop sidebar
    -> condensed navigation
    -> drawer/bottom navigation

Multi-column form
    -> two-column
    -> single-column

Dashboard grid
    -> multi-column
    -> stacked cards
```

---

# 27. Accessibility Baseline

The platform should target **WCAG 2.2 AA** as the baseline for general-purpose UI and use WAI-ARIA only where native HTML semantics are insufficient.

## Accessibility requirements

- semantic HTML
- keyboard-only operation
- visible focus
- logical focus order
- focus trapping for modal dialogs where required
- accessible names
- accessible descriptions
- correct labels
- sufficient contrast
- non-color-only communication
- error identification
- error suggestions where appropriate
- status announcements
- screen-reader support
- reduced motion support
- scalable text
- zoom support
- touch target usability
- captions/transcripts where applicable
- accessible tables/grids
- accessible charts and non-visual alternatives
- accessible drag/drop alternatives
- accessible authentication

WAI-ARIA roles/states/properties must not be used to replace appropriate native HTML controls unnecessarily.

---

# 28. Languages / Internationalization / Localization Module

**This must be a core platform module from day one.** It must not be added after the UI framework exists.

The module should support language, locale, writing system and regional behavior as separate but related concepts.

## 28.1 Core concepts

```text
Language
Locale
Script
Region/Territory
Writing Direction
Calendar
Number System
Currency
Time Zone
Translation
Message
Plural Rule
Collation
```

## 28.2 Language registry

Maintain platform language metadata for:

- language code
- language name
- native name
- script
- region defaults
- direction
- fallback chain
- plural categories
- date conventions
- number conventions
- currency conventions
- supported status
- translation completeness

Use BCP 47 language tags as the interoperability convention.

Examples:

```text
en
sv
sv-SE
en-GB
ar
ar-SA
he
fr-CA
zh-Hans
zh-Hant-TW
```

## 28.3 Localization resolution

Recommended fallback chain:

```text
requested locale
  -> language + region
  -> language
  -> application default locale
  -> platform default
```

This should be configurable.

## 28.4 Translation resources

Translation data should support:

- message IDs
- source text
- translated text
- placeholders
- plural variants
- gender/select variants where needed
- developer comments
- translator notes
- context
- screenshots/design references
- translation status
- reviewer
- version
- fallback
- machine translation status
- human verification status

## 28.5 Message formatting

Never construct translated strings by manually concatenating fragments.

Bad:

```text
"You have " + count + " invoices"
```

Use structured messages with locale-aware pluralization and interpolation.

Support:

- variable interpolation
- plural rules
- select rules
- rich text placeholders
- dates
- times
- numbers
- currencies
- units
- lists
- relative time

Unicode CLDR/LDML should be the principal source of locale-sensitive data.

## 28.6 RTL / LTR architecture

RTL/LTR must be implemented at the design-system and rendering-engine level.

The platform must support:

- LTR
- RTL
- bidirectional text
- mixed-direction content
- runtime direction changes
- per-locale direction
- per-component direction overrides where justified

### Required implementation rules

Prefer CSS logical properties:

```css
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
border-start-start-radius
inset-inline-start
```

Avoid assuming that `left` means start or `right` means end.

The application root should expose directionality conceptually as:

```html
<html lang="ar" dir="rtl">
```

rather than trying to mirror an LTR application using arbitrary coordinate flips.

### RTL testing requirements

Every major component must be tested in:

```text
LTR + short labels
LTR + long labels
RTL + short labels
RTL + long labels
Mixed RTL/LTR content
Numbers inside RTL content
URLs inside RTL content
Code inside RTL content
Tables with RTL labels and LTR identifiers
```

Unicode UAX #9 / the Unicode Bidirectional Algorithm should be treated as the normative foundation for bidirectional text handling.

## 28.7 Internationalization beyond translation

Support:

- locale-sensitive number formatting
- locale-sensitive currency formatting
- currency conversion layer where needed
- measurement units
- date/time formatting
- relative time
- time-zone conversion
- DST correctness
- regional calendars
- week start day
- first week rules
- sorting/collation
- address formats
- phone formats
- postal codes
- names
- person-name ordering
- document numbering
- tax/localization hooks
- right-to-left layout
- locale-specific keyboard behavior

## 28.8 Time-zone rules

Store timestamps in a canonical form, typically UTC/offset-aware instants, while preserving the relevant IANA time zone where a user/business-local time matters.

Do not store only an offset for recurring business schedules.

For example:

```text
"every day at 09:00 Europe/Stockholm"
```

must remain associated with `Europe/Stockholm`, not merely the current `+01:00` or `+02:00` offset.

Use the IANA Time Zone Database for civil-time rules.

## 28.9 Multilingual search

Search should understand:

- language analyzers
- stemming
- tokenization
- transliteration where needed
- locale-specific sorting
- synonyms
- aliases
- multilingual embeddings
- language-aware ranking

## 28.10 Language-aware data model

A resource may have:

```text
canonical structured value
localized display values
locale-specific descriptions
translated content
fallback behavior
```

Do not duplicate the underlying business entity merely because its display language changes.

---

# 29. Date, Time, Number, Currency and Unit Foundation

These should be centralized platform primitives.

## Dates/times

- absolute instant
- local datetime
- date-only
- time-only
- duration
- recurring schedule
- time-zone-aware schedule
- date range
- datetime range
- business calendar

## Number formatting

- decimal separators
- grouping
- significant digits
- compact notation
- percent
- currency
- units
- ordinal numbers
- localized numerals where applicable

## Currency

Support:

- ISO currency codes
- minor units
- rounding rules
- currency display
- exchange-rate abstraction
- multi-currency records
- base/reporting currency
- historical rates

Do not treat monetary values as binary floating-point numbers in financial transaction logic.

---

# 30. Search Platform

Search must be a horizontal platform service.

## 30.1 Lexical search

- exact
- phrase
- prefix
- fuzzy
- stemming
- tokenization
- facets
- filters
- ranking

## 30.2 Semantic search

- embeddings
- vector search
- semantic similarity
- hybrid retrieval
- reranking

## 30.3 Structural search

- field filters
- range queries
- dates
- numbers
- relationships
- tenant
- permissions

## 30.4 Context-aware search

Ranking can account for:

- current user
- tenant
- role
- permissions
- recent activity
- workspace
- language
- device
- freshness

Search results must be permission-aware before being presented to the user or AI.

---

# 31. File / Document / Content Platform

File handling must be first-class.

Support:

- object storage
- folder hierarchy
- file metadata
- versions
- previews
- thumbnails
- OCR
- text extraction
- document parsing
- virus/malware scanning
- content classification
- deduplication
- retention
- legal hold
- permissions
- signed access
- sharing
- download/export
- conversion
- indexing
- comments
- annotations

Files should be able to flow through:

```text
File
 -> Document
 -> Text extraction
 -> Search index
 -> Knowledge source
 -> Retrieval
 -> AI context
 -> Workflow
 -> Audit
```

---

# 32. Notifications Platform

Universal notification object:

```text
Notification
  ├── recipient
  ├── channel
  ├── priority
  ├── template
  ├── locale
  ├── triggering event
  ├── action/deep link
  └── delivery status
```

Channels:

- in-app
- email
- SMS
- push
- webhook
- Teams/Slack-like collaboration channels
- voice where required
- agent-to-agent messaging

Features:

- preferences
- batching
- digest
- escalation
- priorities
- retries
- tracking
- localization
- templates
- quiet periods

---

# 33. Collaboration Platform

Horizontal collaboration capabilities:

- comments
- mentions
- reactions
- assignments
- watchers
- followers
- subscriptions
- activity feed
- presence
- shared dashboards
- shared documents
- shared views
- approvals
- notifications

Every collaboration action should be auditable.

---

# 34. Integration Platform

Every external system should be represented using a normalized connector model.

```text
Connector
  ├── Manifest
  ├── Authentication
  ├── Capabilities
  ├── Objects
  ├── Actions
  ├── Events
  ├── Schemas
  ├── Rate limits
  ├── Mappings
  ├── Sync
  └── Health
```

Support:

- REST
- GraphQL
- SOAP
- gRPC
- webhooks
- SFTP
- databases
- files
- message brokers
- OAuth/OIDC
- SAML
- SCIM
- CDC
- event streams

## Mapping engine

```text
ExternalCustomer.name
    -> Customer.display_name
```

## Data transformation

```text
CSV
 -> normalize
 -> validate
 -> map
 -> deduplicate
 -> upsert
 -> reconcile
```

## Synchronization modes

- full sync
- incremental sync
- cursor-based sync
- CDC
- push
- pull
- bidirectional
- reconciliation
- conflict resolution

---

# 35. API Platform

The platform must be API-first.

The application UI should consume the same canonical action/query contracts exposed to other clients.

## 35.1 API styles

Support:

- REST
- GraphQL
- gRPC
- webhooks
- events
- streaming
- WebSocket/SSE where needed

## 35.2 Machine-readable contracts

Use:

- OpenAPI
- JSON Schema
- AsyncAPI
- Protocol Buffers
- CloudEvents

## 35.3 API requirements

- versioning
- authentication
- authorization
- rate limiting
- quotas
- pagination
- filtering
- sorting
- idempotency
- ETags/concurrency controls
- error model
- problem details
- tracing
- correlation IDs
- audit
- deprecation
- backward compatibility
- API keys/service identity

---

# 36. MCP / AI Interoperability Layer

The platform should expose internal capabilities as machine-consumable tools and resources.

MCP should be treated as one interoperability adapter rather than the internal domain model itself.

Possible mapping:

```text
Platform Resource
    -> MCP Resource

Platform Query
    -> MCP Resource / tool

Platform Action
    -> MCP Tool

Platform Prompt Template
    -> MCP Prompt
```

This allows external AI systems to interact with platform capabilities while the platform retains canonical authorization and audit.

---

# 37. AI Model Gateway

AI providers must be abstracted.

The application should request capabilities rather than hard-code a model vendor.

Example conceptual request:

```text
capability = reasoning
quality = high
latency = medium
cost = medium
region = EU
```

The model router can select the appropriate provider/model.

## Model abstraction

```text
Model
  ├── Provider
  ├── Model ID
  ├── Capabilities
  ├── Context capacity
  ├── Cost
  ├── Latency
  ├── Tool support
  ├── Vision/audio capabilities
  ├── Structured-output support
  ├── Region/data-residency properties
  └── version
```

---

# 38. AI Agent Runtime

Agents should be normal platform resources.

```text
Agent
  ├── identity
  ├── instructions
  ├── model policy
  ├── tools
  ├── permissions
  ├── memory
  ├── knowledge
  ├── workflows
  ├── guardrails
  ├── approval rules
  └── budget/limits
```

Agents should be able to:

- read resources
- query data
- call tools
- execute actions
- start workflows
- wait for events
- request human approval
- create artifacts
- communicate with users
- operate under budgets
- emit audit events

---

# 39. Universal Tool Registry

Every significant platform capability should be exposable as a tool.

Examples:

```text
customer.create
customer.search
customer.update

invoice.create
invoice.approve
invoice.pay

project.create
project.assign_task

analytics.query
report.generate
```

Tool contracts must declare:

- input schema
- output schema
- permissions
- side effects
- risk level
- approval policy
- idempotency
- timeout
- resource scope
- audit behavior

---

# 40. AI Memory Architecture

Do not create one undifferentiated "memory" subsystem.

Separate:

### Conversation memory

Current interaction/session context.

### User memory

Stable user preferences and permitted long-lived facts.

### Organizational memory

Policies, procedures and institutional knowledge.

### Entity memory

History/context associated with a customer, project, asset, etc.

### Workflow memory

Current workflow execution state.

### Episodic memory

Historical interactions/events.

### Semantic memory

Embedded/searchable knowledge.

### Structured memory

Authoritative facts in governed records.

The system of record must remain the authoritative source for business facts.

---

# 41. AI Retrieval / Knowledge Layer

Support:

- documents
- structured database queries
- SQL
- semantic search
- vector search
- graph traversal
- external APIs
- real-time retrieval
- knowledge bases
- citations
- source ranking
- permission-aware retrieval
- multilingual retrieval

AI retrieval must run inside the effective authorization context.

---

# 42. AI Governance and Safety

First-class controls:

- input guardrails
- output guardrails
- tool guardrails
- action risk classification
- approval gates
- budget limits
- rate limits
- allowlists
- denylists
- PII filtering
- data-loss prevention
- prompt injection defense
- tool isolation
- sandboxing
- audit
- model/version tracking
- evaluations
- red-team testing
- human escalation

High-impact or irreversible actions should support mandatory human approval.

---

# 43. Human-in-the-Loop System

Universal approval object:

```text
Pending Approval
  -> Reviewer
  -> Approve / Reject / Edit / Request changes
  -> Continue / Stop workflow
```

Use for:

- payments
- publishing
- access changes
- deployments
- contract issuance
- sensitive data access
- high-value transactions
- AI actions
- destructive operations

---

# 44. Observability Platform

Observability must span infrastructure, applications, workflows, data, integrations and AI.

## Infrastructure

- CPU
- memory
- disk
- network
- container health
- node health

## Application

- requests
- throughput
- latency
- errors
- retries
- saturation

## Database

- query latency
- locks
- slow queries
- replication lag
- connection pools
- storage growth

## Workflows

- execution duration
- retries
- failures
- queue depth
- stuck instances
- compensation activity

## Integrations

- latency
- rate limits
- failures
- synchronization lag
- payload errors

## AI

- model
- provider
- tokens
- cost
- latency
- tool calls
- retrieval
- guardrail outcomes
- evaluation scores
- human approvals

Use OpenTelemetry as the platform observability abstraction where appropriate.

---

# 45. Distributed Tracing / Execution Context

Every execution should carry a context envelope conceptually containing:

```text
request_id
trace_id
span_id
correlation_id
causation_id
tenant_id
actor_id
workflow_id
session_id
environment
locale
timezone
```

Trace a user operation through:

```text
UI
 -> API
 -> authorization
 -> command
 -> transaction
 -> event
 -> workflow
 -> integration
 -> external API
 -> AI model
 -> tool
 -> notification
```

Use W3C Trace Context for distributed propagation where applicable.

---

# 46. Resilience Layer

Build resilience primitives once:

- timeout
- retry
- exponential backoff
- jitter
- circuit breaker
- bulkhead
- rate limiting
- concurrency control
- queueing
- backpressure
- dead-letter queue
- health checks
- liveness
- readiness
- graceful shutdown
- failover
- caching
- replication
- reconciliation

---

# 47. Caching Layer

Support multiple cache classes:

- request cache
- query cache
- object cache
- session cache
- API cache
- materialized result cache
- semantic cache
- AI response cache

Capabilities:

- TTL
- explicit invalidation
- namespaces
- tenant isolation
- versioning
- stale-while-revalidate
- cache warming
- size limits

---

# 48. Secrets Platform

Application modules must not implement their own credential storage.

Support:

- API keys
- OAuth tokens
- passwords
- certificates
- private keys
- SSH keys
- database credentials
- cloud credentials
- signing keys
- encryption key references
- rotation
- expiry
- revocation
- auditing
- short-lived/dynamic credentials

Secrets should never be exposed to UI or model contexts unnecessarily.

---

# 49. Configuration Platform

Separate:

```text
Code
Configuration
Metadata
Tenant configuration
Runtime state
Secrets
```

Support:

- environment configuration
- tenant overrides
- feature configuration
- locale configuration
- branding
- default values
- inheritance
- configuration versioning
- validation
- effective-value resolution

---

# 50. Feature Flags / Entitlements / Experiments

Support:

- boolean flags
- percentage rollout
- user targeting
- tenant targeting
- role targeting
- geography
- application plan
- environment targeting
- time-window targeting
- kill switches
- experiments
- A/B testing

Entitlements must be separable from simple permission checks.

Example:

```text
Permission: user may create dashboards
Entitlement: tenant plan includes 100 dashboards
```

---

# 51. Billing / Metering Layer

For SaaS use cases the core platform should provide generalized billing primitives.

Support:

- plans
- subscriptions
- pricing models
- entitlements
- quotas
- usage meters
- invoices
- credits
- overages
- discounts
- tax hooks
- billing cycles
- trials
- renewals
- cancellation
- dunning hooks
- payment-provider integration

Meter arbitrary dimensions:

```text
API calls
users
storage
AI tokens
workflow runs
records
seats
compute time
```

---

# 52. Data Lifecycle / Retention

Every significant resource should be able to define:

```text
create
 -> active
 -> superseded
 -> archived
 -> retained
 -> deleted
```

Support:

- soft delete
- hard delete
- restore
- purge
- archival
- cold storage
- TTL
- retention policy
- legal hold
- compliance retention
- deletion workflows

---

# 53. Versioning System

Version independently:

- schemas
- APIs
- application definitions
- workflows
- UI definitions
- configuration
- plugins
- connectors
- prompts
- agents
- tools
- metrics
- semantic models
- models
- deployment artifacts

Provide compatibility/migration contracts.

---

# 54. Metadata Registry

Create a registry that can answer:

```text
What exists?
Who owns it?
What type is it?
What does it depend on?
Who can access it?
What APIs expose it?
What events does it emit?
What workflows use it?
What UI renders it?
What metrics measure it?
What documentation describes it?
What data produced it?
What AI systems can access it?
```

This registry becomes one of the platform's principal control-plane services.

---

# 55. Dependency Graph

Everything important should be graphable.

```text
Tenant
 ├── Users
 ├── Applications
 │    ├── Pages
 │    ├── Forms
 │    ├── Workflows
 │    └── APIs
 ├── Data
 │    ├── Customers
 │    ├── Orders
 │    └── Products
 ├── Integrations
 │    ├── ERP
 │    ├── CRM
 │    └── Payments
 └── AI
      ├── Agents
      ├── Tools
      └── Knowledge
```

Use the graph for:

- dependency analysis
- impact analysis
- governance
- AI discovery
- documentation
- permissions
- lineage
- troubleshooting
- architecture visualization

---

# 56. Data Lineage

Track lineage such as:

```text
Source API
 -> ingestion
 -> raw dataset
 -> transformation
 -> semantic model
 -> metric
 -> dashboard
 -> AI answer
```

Also track business-object lineage:

```text
External customer
 -> customer record
 -> opportunity
 -> revenue metric
 -> forecast
 -> AI recommendation
```

---

# 57. Data Governance

First-class governance dimensions:

- ownership
- stewardship
- classification
- sensitivity
- PII indicators
- provenance
- lineage
- quality
- retention
- access policy
- purpose
- residency
- legal hold
- compliance status
- certification

---

# 58. Data Quality Engine

Support reusable data-quality rules:

- requiredness
- uniqueness
- format
- referential integrity
- ranges
- consistency
- freshness
- completeness
- duplication
- anomaly detection
- reconciliation

Expose quality scores to:

- data interfaces
- workflows
- administrators
- dashboards
- AI agents

---

# 59. Import / Export Framework

Universal import/export pipeline:

```text
Input
 -> detect
 -> parse
 -> profile
 -> map
 -> validate
 -> normalize
 -> deduplicate
 -> preview
 -> approve
 -> commit
 -> audit
```

Formats should include, as applicable:

- CSV
- XLSX
- JSON
- JSONL
- XML
- Parquet
- database extracts
- API payloads
- PDFs/documents through extraction

Support dry-run and rollback/reconciliation where practical.

---

# 60. Application Builder

The platform should eventually expose:

```text
Create Application

Name
Domain
Data
Roles
Permissions
Navigation
Pages
Views
Forms
Workflows
Actions
Events
Notifications
Integrations
Analytics
AI
Localization
Branding
Billing
Deployment
```

The generated output should include the application definition plus all required deployable/runtime artifacts.

---

# 61. Application Definition / Platform Manifest

Introduce a canonical declarative object such as:

```yaml
application:
  name: Sales Platform
  version: 1.0.0

tenancy:
  model: tenant-scoped

languages:
  default: en
  supported:
    - en
    - sv
    - ar

security:
  roles: []
  policies: []

entities:
  Customer: {}
  Opportunity: {}
  Activity: {}

relationships: []

states: []

actions: []

commands: []

events: []

workflows: []

queries: []

views: []

navigation: []

metrics: []

dashboards: []

integrations: []

notifications: []

ai:
  agents: []
  tools: []
  knowledge: []

i18n:
  locales: []
  messages: []

feature_flags: []

entitlements: []
```

This becomes the canonical artifact from which AI, code and builders generate the application.

---

# 62. AI-Generated Application Pipeline

Natural-language request:

```text
Build a procurement system for a multinational manufacturer.
```

AI should translate intent into:

```text
1. Domain entities
2. Relationships
3. States
4. Actions
5. Commands
6. Permissions
7. Policies
8. Workflows
9. Queries
10. Views
11. Navigation
12. Metrics
13. Dashboards
14. Notifications
15. Integrations
16. AI agents/tools
17. Localizations
18. Audit requirements
19. Tests
20. Documentation
```

The platform then validates the generated specification, detects conflicts, previews it, executes migrations and builds/deploys the resulting application.

---

# 63. AI Application Generation Guardrails

AI-generated definitions must pass gates before becoming active:

```text
Natural-language intent
 -> requirement extraction
 -> application specification
 -> schema validation
 -> dependency validation
 -> security analysis
 -> authorization analysis
 -> UX validation
 -> accessibility validation
 -> localization validation
 -> workflow validation
 -> API contract validation
 -> test generation
 -> test execution
 -> deployment plan
 -> human approval where required
 -> deploy
```

Never allow AI to bypass foundational policy enforcement simply because it generated the application.

---

# 64. Developer Platform

The platform should provide:

- SDKs
- CLI
- API explorer
- schema explorer
- workflow debugger
- event viewer
- query console
- log viewer
- trace viewer
- component catalog
- connector catalog
- plugin SDK
- app scaffolding
- migration tools
- local development runtime
- testing framework
- seed data tooling
- environment manager
- deployment tooling
- documentation generator

---

# 65. Plugin Architecture

Everything not fundamental should be replaceable/extensible.

A plugin should declare:

```text
manifest
capabilities
configuration
schemas
permissions
events
actions
UI components
API endpoints
migrations
health checks
version
compatibility
```

Examples:

```text
Stripe plugin
SAP plugin
Salesforce plugin
OpenAI plugin
Anthropic plugin
Google plugin
Slack/Teams plugin
Snowflake plugin
Data warehouse plugin
Search plugin
Maps plugin
Visualization plugin
```

---

# 66. Domain Packs

Universal primitives should support pluggable domain packs.

## ERP

- general ledger
- AP
- AR
- invoicing
- procurement
- purchasing
- inventory
- warehouse
- manufacturing
- supply chain
- projects
- assets
- HR
- payroll
- expenses
- budgeting
- forecasting

## CRM

- leads
- accounts
- contacts
- opportunities
- activities
- pipelines
- campaigns
- customer service
- customer success

## Service management

- incidents
- problems
- changes
- service requests
- SLAs
- knowledge
- assets
- CMDB

## Project management

- projects
- workstreams
- tasks
- milestones
- dependencies
- resources
- budgets
- time
- risks

## Commerce

- catalog
- products
- prices
- carts
- orders
- subscriptions
- payments
- refunds
- fulfillment
- promotions

## CMS / content

- pages
- posts
- media
- publishing
- localization
- review workflows

## Analytics

- datasets
- semantic models
- metrics
- dashboards
- reports
- alerts

## AI

- assistants
- agents
- workflows
- tools
- memory
- knowledge
- evaluation

The goal is not to create eight independent platforms. The goal is to implement these as domain vocabularies on the shared substrate.

---

# 67. Enterprise UI Page Archetypes

Provide reusable page patterns.

## CRUD

```text
List -> Detail -> Create/Edit
```

## Master/detail

```text
List | Record
     | Related records
```

## Workspace

```text
Navigation
 + Work queue
 + Detail
 + Activity
 + Contextual actions
```

## Dashboard

```text
Filters
 -> KPI row
 -> charts
 -> detailed tables
```

## Command center

```text
KPIs
 -> Alerts
 -> Work queues
 -> Actions
```

## Workflow screen

```text
Current stage
 -> Required data
 -> Available actions
 -> Approval
 -> Next stage
```

## AI workspace

```text
Conversation
 -> context
 -> retrieved data
 -> tools
 -> actions
 -> approvals
 -> results
```

---

# 68. UI State Model

Every component/page must explicitly support meaningful states:

- loading
- loaded
- empty
- partial
- stale
- error
- unauthorized
- forbidden
- offline
- syncing
- saving
- saved
- dirty
- conflicted
- optimistic
- read-only
- disabled
- rate-limited
- expired

State transitions must be testable.

---

# 69. Performance and Web UX Baseline

The framework must encode performance considerations rather than leaving them to each application.

## Front-end requirements

- code splitting
- lazy loading
- asset optimization
- image optimization
- font optimization
- caching
- prefetching where justified
- virtualization for large lists
- pagination/infinite scrolling where appropriate
- optimistic updates when safe
- server-side rendering or streaming where useful
- progressive enhancement where appropriate

## Interaction performance

- avoid unnecessary blocking operations
- show progress for long-running work
- allow cancellation
- preserve user input during errors
- avoid layout shifts
- avoid jarring transitions
- throttle/debounce appropriately

## Enterprise data performance

- server-side pagination
- server-side filtering
- query limits
- indexed filters
- aggregation controls
- streaming/export jobs for huge datasets
- background processing

---

# 70. Front-End Technology Standards

The framework should produce standards-compliant web interfaces.

Recommended baseline concepts:

- semantic HTML
- CSS logical properties
- responsive CSS
- media queries
- container queries
- accessible forms
- progressive enhancement where useful
- standardized DOM/events
- component encapsulation
- type-safe client contracts

HTML should be the semantic foundation and modern CSS should handle layout and responsive behavior rather than JavaScript-driven geometry wherever possible.

---

# 71. Security Architecture

Security is an architectural plane, not one module.

```text
                    SECURITY
                       |
        +--------------+--------------+
        |              |              |
     Identity      Authorization     Audit
        |              |              |
      Secrets        Policies       Compliance
        |              |              |
   Encryption       Tenancy        Governance
```

Security controls must exist in:

- API gateway
- application service
- command/action layer
- data/query layer
- file layer
- search layer
- workflow layer
- event layer
- AI retrieval/tool layer
- administrative UI

---

# 72. Privacy / Compliance Architecture

The framework should make privacy and governance capabilities composable.

Support concepts such as:

- data classification
- consent
- purpose limitation metadata
- retention
- deletion
- export
- data subject workflows
- audit
- residency
- encryption
- key management
- access reviews
- legal holds
- policy acknowledgements

Target standards/frameworks where appropriate:

- GDPR / applicable privacy law
- ISO/IEC 27001 family
- ISO/IEC 27701 for privacy information management
- SOC 2 control mapping where applicable
- regional data residency requirements

These are governance/compliance targets, not interchangeable technical standards; the platform should provide primitives that make compliance implementations possible.

---

# 73. Audit Architecture

Every meaningful state-changing operation should generate an auditable record.

Audit record:

```text
who
what
when
where
tenant
resource
action
before
after
reason
source
request_id
trace_id
approval
actor_type
```

Actor type must distinguish:

- human
- service
- scheduler
- workflow
- integration
- AI agent
- administrator

AI-generated or AI-executed actions must be especially traceable.

---

# 74. Error Model

The framework should have a canonical structured error object.

Conceptual shape:

```json
{
  "code": "invoice.approval.forbidden",
  "message": "Approval is not permitted in the current context.",
  "details": {},
  "field_errors": [],
  "retryable": false,
  "request_id": "...",
  "trace_id": "..."
}
```

Errors should be:

- machine-readable
- localizable
- safe to expose
- actionable
- traceable
- categorized

---

# 75. Concurrency and Conflict Model

Support:

- optimistic concurrency
- version numbers
- ETags
- row/version checks
- locks only when truly necessary
- edit conflict detection
- merge/reconciliation
- idempotency

UI should clearly communicate concurrent edit conflicts.

---

# 76. Offline / Intermittent Connectivity Support

Where relevant, platform primitives should support:

- local drafts
- queued operations
- synchronization
- conflict detection
- retry
- connectivity state
- offline read models
- deferred uploads

Not every application needs offline-first behavior, but the framework should make it possible without redesigning the domain model.

---

# 77. Mobile Capability

Mobile should not mean merely shrinking desktop UI.

The platform should support:

- responsive web
- touch interaction
- mobile-specific navigation
- camera/file capture where permitted
- device permissions
- push notifications
- offline data where applicable
- compact data presentation
- mobile-specific workflows
- deep links

The same resource/action/workflow model should work across desktop, mobile and AI interfaces.

---

# 78. The Universal Context Object

Every execution should receive a normalized context:

```text
Context
  ├── tenant
  ├── organization
  ├── workspace
  ├── user/actor
  ├── roles
  ├── permissions
  ├── locale
  ├── timezone
  ├── device
  ├── request
  ├── transaction
  ├── trace
  ├── workflow
  ├── environment
  └── feature/entitlement context
```

This is the bridge between identity, policy, localization, feature flags, AI and observability.

---

# 79. Physical Storage Strategy

Logical platform concepts should map to specialized physical stores.

Suggested reference architecture:

```text
System of Record
    PostgreSQL or equivalent relational database

Object Storage
    S3-compatible object storage

Cache
    Redis or equivalent

Search
    OpenSearch / Elasticsearch or equivalent

Analytics
    Data warehouse / lakehouse / OLAP

Vector
    pgvector / dedicated vector engine

Streaming
    Kafka / Redpanda / NATS / equivalent

Workflow
    Durable workflow engine

Secrets
    Vault/KMS-like secret infrastructure

Telemetry
    OpenTelemetry-compatible observability stack
```

## Important rule

Do not make every workload share one storage technology merely for architectural simplicity.

Instead:

> **Unify the logical data model; specialize physical storage by workload.**

---

# 80. Database Philosophy

A relational database such as PostgreSQL is a strong default for the transactional system of record because it supports:

- ACID transactions
- relational modeling
- constraints
- JSON/JSONB
- indexes
- partitioning
- row-level security
- replication
- extensions
- full-text capabilities

But the platform should hide physical persistence behind a data-access abstraction so workloads can use specialized engines without changing their application-level model.

## Do not make everything JSON

Use strong relational structures for:

- identities
- relationships
- financial transactions
- business-critical state
- audit
- high-value query paths
- permissions

Use flexible metadata/JSON for:

- extensions
- custom attributes
- UI configuration
- tenant-specific extensions
- experimental features

---

# 81. Application Lifecycle Management

Support environments:

```text
local
 -> development
 -> staging
 -> QA
 -> UAT
 -> production
```

Support:

- application versions
- schema migrations
- data migrations
- workflow migrations
- API versioning
- configuration promotion
- secrets references
- feature flags
- rollback
- restore
- backups
- release notes
- deployment approvals
- deployment audit

---

# 82. Environment and Deployment Model

Applications must be portable across environments.

Separate:

```text
application definition
configuration
secrets
runtime state
environment bindings
```

Deployment process:

```text
validate
 -> plan
 -> migrate
 -> deploy
 -> health-check
 -> smoke test
 -> promote
```

Provide rollback and recovery semantics.

---

# 83. Testing Platform

A universal application platform needs universal testing primitives.

## Schema tests

- validation
- constraints
- relationship integrity

## Policy tests

- allow/deny matrix
- role tests
- tenant isolation tests
- field access tests

## Workflow tests

- happy paths
- failure paths
- timeout paths
- retry paths
- compensation paths

## UI tests

- responsive layouts
- accessibility
- keyboard navigation
- RTL/LTR
- localization expansion
- error states
- empty/loading states

## Integration tests

- contracts
- webhooks
- synchronization
- retries
- idempotency

## AI tests

- evaluation datasets
- groundedness
- authorization
- tool use
- tool misuse
- prompt injection
- refusal/guardrail behavior
- cost/latency
- regression tests

---

# 84. Contract Testing

Every modular boundary should have machine-readable contracts.

Examples:

```text
API contract
Event contract
Schema contract
Action contract
Tool contract
Connector contract
UI component contract
Plugin contract
Workflow contract
```

Generated applications should automatically generate contract tests where possible.

---

# 85. Documentation as a Platform Artifact

Documentation should be generated from metadata where practical.

Generate:

- data dictionaries
- API docs
- event catalogs
- workflow docs
- permission matrices
- architecture diagrams
- integration documentation
- UI documentation
- metric definitions
- AI tool documentation
- plugin docs
- operational runbooks

Documentation must carry version and ownership metadata.

---

# 86. Developer and Resource Catalog

A generalized catalog should expose every platform asset:

```text
Application
Service
Component
API
Entity
Metric
Dataset
Workflow
Integration
Agent
Tool
Plugin
Environment
Deployment
```

For each asset, show:

- owner
- status
- dependencies
- consumers
- versions
- health
- documentation
- permissions
- lineage
- recent activity

This combines the useful ideas of software catalogs and metadata registries into one platform graph.

---

# 87. UX Design-System Governance

The design system should be treated like an API.

Each component must have:

- semantic meaning
- accessibility contract
- anatomy
- states
- variants
- responsive behavior
- RTL behavior
- localization behavior
- interaction rules
- keyboard behavior
- touch behavior
- motion behavior
- visual tokens
- usage guidance
- anti-patterns
- testing requirements

Component changes must be versioned and compatibility-aware.

---

# 88. Responsive + RTL + Accessibility Matrix

Every reusable component should pass a baseline matrix:

| Dimension | Test |
|---|---|
| Viewport | compact / tablet / desktop / wide |
| Direction | LTR / RTL / mixed content |
| Language | short / long / translated text |
| Accessibility | keyboard / screen reader / focus |
| Content | empty / normal / very long |
| State | loading / success / error / disabled |
| Data | one row / many rows / no rows |
| Permission | allowed / read-only / forbidden |
| Connectivity | online / offline / reconnecting |
| Input | mouse / keyboard / touch |
| Localization | date / number / currency / plural |

This should become an automated component certification test rather than a manual recommendation.

---

# 89. Global Content Expansion Testing

Translation frequently breaks interfaces through text expansion.

Test at least:

- short labels
- average labels
- long labels
- German-like expansion
- Arabic RTL
- CJK glyph density
- long URLs
- long email addresses
- large numbers
- long names

Do not hard-code widths based on English strings.

---

# 90. UI Composition Engine

The application renderer should treat UI as a tree/graph of declarative nodes.

Example:

```text
Page
 ├── Header
 │    ├── Title
 │    ├── Status
 │    └── Actions
 ├── FilterBar
 ├── KPIGroup
 ├── DataTable
 └── DetailDrawer
```

Each node resolves:

```text
component
props
binding
query
permissions
visibility
state
responsive rules
locale
analytics hooks
accessibility semantics
actions
```

---

# 91. Declarative Binding Model

A UI element should be able to bind to:

- resource field
- relationship
- query result
- metric
- computed expression
- workflow state
- permission
- feature flag
- AI output
- configuration

Example:

```text
Button.visible = permission("invoice.approve")
Button.enabled = invoice.status == "submitted"
```

---

# 92. Navigation and Deep-Link Model

Every important application state should be addressable where practical.

Support:

- URL routing
- deep links
- resource routes
- query state
- filter state
- view state
- tab state
- modal state where useful
- browser history
- breadcrumbs

This improves usability, automation, integrations and AI actionability.

---

# 93. Universal Activity Timeline

Most enterprise resources benefit from a standard activity model:

```text
Created
Updated
Commented
Assigned
Status changed
Approved
Rejected
Email sent
Workflow started
Workflow completed
AI action executed
Integration synchronized
```

This can power record history, customer timelines, project history and operational audit views.

---

# 94. Universal Task / Work Item Model

A task should be able to represent work generated by:

- human
- workflow
- integration
- AI agent
- scheduler

Attributes:

- owner
- assignee
- priority
- due date
- SLA
- state
- parent
- dependencies
- context
- actions
- approvals
- audit

This creates a common abstraction for CRM tasks, ERP approvals, service tickets, project tasks and agent work.

---

# 95. Universal Case Model

A case is a container for a long-running issue or customer/business matter.

Support:

- status
- priority
- parties
- resources
- activity
- attachments
- tasks
- timeline
- workflow
- SLA
- approvals
- resolution

This powers support, legal cases, HR cases, insurance cases and operational exceptions.

---

# 96. Universal Party / Organization Model

Many applications repeatedly need:

- person
- organization
- household
- team
- legal entity
- address
- contact point
- role in relationship

This should be a reusable foundation rather than reimplemented independently in every domain pack.

---

# 97. Universal Financial Primitives

For broad ERP/platform applicability, foundational finance concepts should be available as a domain pack with stable interfaces:

- money
- currency
- account
- ledger
- journal entry
- debit/credit
- tax
- exchange rate
- fiscal period
- cost center
- budget
- commitment
- invoice
- payment
- settlement

Financial primitives should be strongly typed and transaction-safe.

---

# 98. Universal Asset / Inventory Primitives

Broad physical-operations applications benefit from:

- asset
- location
- warehouse
- bin
- stock item
- unit
- quantity
- movement
- reservation
- serial number
- lot/batch
- maintenance event

Again, these are domain primitives implemented above the universal substrate, not hard-coded into the core.

---

# 99. Universal Time / Schedule / Calendar Model

Support:

- instant
- date
- time
- duration
- interval
- schedule
- recurrence
- business calendar
- holiday calendar
- fiscal calendar
- working hours
- time zone
- blackout period

Calendars should themselves be resources and may be tenant-specific.

---

# 100. Platform Governance Principles

## Principle 1 — Metadata first

Application semantics live in machine-readable definitions wherever possible.

## Principle 2 — Security below the UI

The lower-level execution/data layers enforce security.

## Principle 3 — One action, many interfaces

Human UI, API, workflow, automation and AI use the same action contracts.

## Principle 4 — Events describe facts

Do not encode downstream business behavior directly into event definitions.

## Principle 5 — Domain packs are extensions

ERP/CRM/CMS/etc. are implemented on the common substrate.

## Principle 6 — Logical unity, physical specialization

Give users a unified platform while allowing storage/compute specialization underneath.

## Principle 7 — Internationalization is foundational

Language, locale, RTL/LTR and regional behavior are core infrastructure.

## Principle 8 — Responsive behavior is contractual

Components define how they adapt, not merely a collection of CSS breakpoints.

## Principle 9 — Accessibility is default

Accessibility is built into components and generated interfaces.

## Principle 10 — AI is a first-class actor

AI operates through the same resources, permissions, actions, workflows and audits as all other actors.

## Principle 11 — The system of record stays authoritative

AI memory should not silently become the source of truth for business data.

## Principle 12 — Everything is observable

Every significant operation should be traceable.

---

# 101. Foundational Standards Baseline

The platform should deliberately align with mature, interoperable standards rather than inventing replacements unnecessarily.

| Area | Preferred foundation | Purpose |
|---|---|---|
| Web semantics | HTML Living Standard | Semantic structure/forms |
| Accessibility | WCAG 2.2 AA | Accessibility baseline |
| Accessible semantics | WAI-ARIA 1.2 | Rich UI accessibility semantics |
| Internationalization | Unicode + CLDR/LDML | Locale, language, formatting |
| Bidirectional text | Unicode UAX #9 | RTL/LTR/bidi layout behavior |
| Language tags | BCP 47 | Language/locale identifiers |
| Time zones | IANA tz database | Civil-time rules |
| HTTP API contracts | OpenAPI 3.2.1 | Machine-readable HTTP APIs |
| Event API contracts | AsyncAPI 3.x | Event/message APIs |
| Event envelope | CloudEvents 1.0 | Event interoperability |
| Observability | OpenTelemetry | Traces, metrics, logs, context |
| Distributed tracing | W3C Trace Context | Trace propagation |
| Schema interchange | JSON Schema | Structured schema/validation |
| Visualization | Vega/Vega-Lite-style declarative grammar | Data visualization semantics |
| Identity | OIDC / OAuth 2.x | Identity/delegated access |
| Federation | SAML where required | Enterprise SSO |
| Provisioning | SCIM | User/group lifecycle |
| Web authentication | WebAuthn/passkeys | Phishing-resistant auth |
| API security | Current OAuth security BCPs | Safer OAuth deployments |
| Policy | Rego/OPA-like policy concepts | Policy-as-code separation |
| Relationship authorization | ReBAC/OpenFGA-like model | Relationship-based access |
| Design tokens | Machine-readable token system | Cross-platform design consistency |
| AI interoperability | MCP | Tools/resources/prompts for AI integration |

The platform may provide higher-level abstractions above these standards, but it should not create incompatible proprietary equivalents without a compelling reason.

---

# 102. Standards That Are Normative vs. Reference Architecture

Not every item above is a formal standard.

### Prefer normative standards where they exist

Examples:

- HTML
- WCAG
- WAI-ARIA
- Unicode algorithms
- BCP 47
- IANA TZDB
- OpenAPI
- AsyncAPI
- CloudEvents
- OpenTelemetry
- OAuth/OIDC specifications
- SCIM
- WebAuthn
- W3C Trace Context

### Treat these as architectural reference models

- PostgreSQL as a strong relational default
- Redis as a cache
- Kafka/Redpanda/NATS as event infrastructure
- Temporal-like durable workflows
- OpenSearch/Elasticsearch-like search
- Backstage-like catalog ideas
- OPA/OpenFGA-like authorization concepts
- Vega-Lite-like visualization grammar

The framework should remain provider-neutral where practical.

---

# 103. Core API Surface

The platform API should remain relatively small and composable.

Conceptual top-level resources:

```text
/actors
/organizations
/tenants
/workspaces
/applications
/resources
/schemas
/relationships
/states
/actions
/commands
/events
/workflows
/jobs
/schedules
/queries
/views
/policies
/roles
/permissions
/files
/search
/datasets
/metrics
/dashboards
/integrations
/connectors
/notifications
/agents
/tools
/models
/knowledge
/config
/features
/entitlements
/audit
/deployments
/environments
/plugins
```

Application-specific APIs can be generated/composed above this substrate.

---

# 104. Reference Internal Module Boundaries

Start as a modular monolith with explicit internal boundaries.

```text
identity
  tenancy
  authorization
  metadata
  schema
  resources
  relationships
  data
  query
  files
  search
  localization
  visualization
  ui
  events
  messaging
  workflow
  scheduling
  integrations
  notifications
  collaboration
  analytics
  billing
  configuration
  feature-flags
  ai
  audit
  observability
  developer-platform
  deployment
  governance
```

Each module should have:

- domain model
- public interface
- private implementation
- commands
- queries
- events
- tests
- migration strategy

---

# 105. Modular Monolith First — Not Microservices First

Do not start by creating dozens of microservices.

Start with:

> **A modular monolith + strong contracts + explicit events + replaceable infrastructure adapters.**

Extract services only when justified by:

- independent scaling
- reliability isolation
- deployment independence
- security boundary
- data residency
- ownership/team boundary
- operational need

The internal architecture must make extraction possible, but distribution must not become a premature goal.

---

# 106. What Belongs in the True Core vs. Domain Packs

## True core

- runtime
- identity
- tenancy
- authorization
- metadata
- schema
- resources
- relationships
- commands
- actions
- events
- workflow
- query
- UI runtime
- localization
- search abstraction
- files abstraction
- integrations abstraction
- configuration
- feature flags
- observability
- audit
- plugin system
- deployment/ALM primitives
- AI foundation

## Domain packs

- accounting
- payroll
- manufacturing
- inventory
- CRM opportunity processes
- HR workflows
- help desk workflows
- CMS publishing
- e-commerce ordering
- specialized analytics models

This boundary must remain disciplined.

---

# 107. The Universal Execution Pipeline

A generic platform operation should conceptually flow through:

```text
INPUT
  |
  v
PARSE / VALIDATE
  |
  v
IDENTITY + CONTEXT
  |
  v
AUTHORIZATION / POLICY
  |
  v
BUSINESS RULES
  |
  v
COMMAND / ACTION
  |
  v
TRANSACTION
  |
  v
STATE CHANGE
  |
  +----> AUDIT
  |
  +----> EVENT
           |
           +----> WORKFLOW
           +----> NOTIFICATION
           +----> INTEGRATION
           +----> ANALYTICS
           +----> AI REACTION
  |
  v
RESPONSE / VIEW / ARTIFACT
```

This is the common execution backbone of the system.

---

# 108. The Universal AI Execution Pipeline

AI operations should use the same platform backbone:

```text
User / Event / Schedule
  |
  v
Agent
  |
  v
Context assembly
  |
  +--> permission-aware retrieval
  |
  +--> policy evaluation
  |
  v
Model selection
  |
  v
Reason / Generate
  |
  v
Tool decision
  |
  v
Tool authorization
  |
  v
Tool execution
  |
  +--> audit
  +--> event
  +--> workflow
  |
  v
Result validation
  |
  v
Human approval if required
  |
  v
State change
```

AI must not be an alternative execution plane that bypasses normal platform controls.

---

# 109. Universal Data-to-AI Flow

```text
Source
 -> Resource
 -> Schema
 -> Query
 -> Permission filter
 -> Retrieval
 -> Context
 -> Agent/Model
 -> Tool/action
 -> Result
 -> Human/system validation
 -> State change
 -> Audit/event
```

This is the architecture that enables safe AI-native enterprise applications.

---

# 110. Universal UX-to-Backend Flow

```text
UI Component
 -> View Definition
 -> Action/Query
 -> Context
 -> Policy
 -> Backend
 -> Resource
 -> Event
 -> UI state update
```

This ensures the UI never becomes a separate business-logic universe.

---

# 111. Universal Integration Flow

```text
External Event/API
 -> Connector
 -> Authentication
 -> Mapping
 -> Validation
 -> Command
 -> Resource
 -> Event
 -> Workflow
 -> External response/side effect
 -> Reconciliation
```

---

# 112. Application Portability Goal

A mature application definition should ideally be portable across:

- development
- staging
- production
- cloud providers
- tenant isolation models
- AI providers
- storage providers
- search providers
- event brokers
- deployment environments

Only infrastructure bindings should materially change.

---

# 113. Platform Extensibility Model

Extensions should be possible at multiple levels:

```text
Primitive extension
Schema extension
Field extension
Resource extension
Action extension
Workflow extension
UI component extension
Visualization extension
Connector extension
AI tool extension
Agent extension
Domain pack extension
Plugin extension
```

Extensions must declare dependencies and compatibility.

---

# 114. Backward Compatibility Rules

A platform intended to support gigantic long-lived products must protect compatibility.

Rules should cover:

- API contracts
- event schemas
- database schemas
- application definitions
- UI component contracts
- plugin APIs
- tool schemas
- agent behavior contracts
- metric definitions
- workflow versions

Never silently mutate a semantic contract that downstream systems rely upon.

---

# 115. Migration Engine

The platform should support first-class migrations for:

- schema changes
- data transformations
- field renames
- relationship changes
- enum changes
- permission changes
- workflow changes
- event changes
- metadata changes
- localization changes

Migration plans should be inspectable before execution.

---

# 116. Enterprise Governance UX

Administrative interfaces should expose:

- tenant map
- user/group management
- role/permission matrix
- data model
- policy explorer
- API explorer
- event explorer
- workflow monitor
- connector health
- integration logs
- audit search
- AI agent inventory
- tool inventory
- secrets references
- deployment status
- usage/billing
- data lineage
- compliance controls

---

# 117. AI Builder / Application Copilot

A platform-native AI builder should understand the full meta-model.

Example request:

> Build an expense-management application for 12 legal entities, with Swedish and English, Arabic RTL support, manager approval below €10k and CFO approval above €10k, corporate cards, monthly dashboards and an AI assistant that flags unusual spending.

The AI should construct:

```text
Entities
Relationships
Roles
Policies
Approval rules
Workflow
Views
Responsive layouts
Localization
RTL behavior
Metrics
Dashboards
Notifications
Integrations
AI agent
AI tools
Guardrails
Audit policies
Tests
```

The result is a platform manifest, not a pile of generated source code.

---

# 118. AI Design Review Layer

Before committing generated application metadata, AI should inspect:

### Data

- missing entities
- ambiguous relationships
- normalization problems
- uniqueness assumptions
- lifecycle gaps

### Security

- missing access rules
- privilege escalation
- tenant leakage
- agent overreach
- insecure object access

### UX

- missing states
- unclear navigation
- destructive flows
- poor mobile behavior
- keyboard/accessibility gaps

### Localization

- hard-coded strings
- layout assumptions
- missing translations
- RTL breakage
- locale formatting issues

### Operations

- missing retries
- duplicate side effects
- absent audit
- no observability
- missing reconciliation

### AI

- unbounded tools
- unsafe side effects
- retrieval leakage
- missing approval
- poor grounding

---

# 119. Application Completeness Checklist

A generated application should not be considered production-ready until it has:

```text
[ ] Data model
[ ] Relationships
[ ] Lifecycle/state model
[ ] Actions
[ ] Commands
[ ] Policies
[ ] Permissions
[ ] Tenant isolation
[ ] Audit
[ ] API contract
[ ] Events
[ ] Workflows
[ ] Failure paths
[ ] Loading states
[ ] Empty states
[ ] Error states
[ ] Responsive layouts
[ ] LTR behavior
[ ] RTL behavior where applicable
[ ] Localization
[ ] Accessibility
[ ] Search
[ ] Analytics
[ ] Notifications
[ ] Integration contracts
[ ] Observability
[ ] Tests
[ ] Deployment definition
[ ] Backup/recovery considerations
[ ] Documentation
[ ] AI safety review where AI is present
```

---

# 120. What the Final Platform Enables

Once the substrate exists, the following become different compositions of the same machinery:

## AI application

```text
Agent + Tool + Knowledge + Workflow + Policy + UI
```

## Data visualization platform

```text
Dataset + Query + Semantic Model + Visualization + Dashboard
```

## CRM

```text
Party + Customer + Opportunity + Activities + Workflow + Analytics
```

## ERP

```text
Party + Product + Inventory + Finance + Transactions + Workflow + Reporting
```

## SaaS application

```text
Tenant + Users + Resources + Entitlements + Billing + UI + APIs
```

## CMS

```text
Document + Version + Workflow + Localization + Publishing + Search
```

## Project system

```text
Project + Work Item + Resource + Schedule + Workflow + Collaboration
```

## Service platform

```text
Case + Ticket + Asset + SLA + Workflow + Knowledge + Notifications
```

## IoT platform

```text
Device + Telemetry + Time Series + Rules + Events + Alerts + Workflow
```

## Large integrated enterprise platform

```text
Everything above
  + federation
  + shared identity
  + shared data graph
  + event backbone
  + common governance
  + common AI layer
  + integration fabric
```

---

# 121. Recommended Implementation Order

The implementation order matters enormously because later layers depend on earlier contracts.

## Phase 0 — Architecture contracts

Define before coding heavily:

- vocabulary
- resource envelope
- actor/context model
- tenant model
- IDs
- schema conventions
- action/command contract
- event envelope
- API conventions
- error model
- audit model
- versioning rules
- localization contract

## Phase 1 — True kernel

Build:

1. runtime
2. identity
3. tenancy
4. authorization
5. metadata registry
6. resource model
7. schema engine
8. relationships
9. audit

## Phase 2 — Data and execution

10. database abstraction
11. query engine
12. commands/actions
13. state machine
14. rules
15. transactions/idempotency
16. events
17. messaging
18. workflow
19. scheduler

## Phase 3 — Experience

20. design tokens
21. component library
22. UI metadata model
23. responsive engine
24. accessibility foundation
25. localization/languages/RTL
26. navigation
27. forms
28. tables/grids
29. page composition
30. dashboards
31. visualization

## Phase 4 — Horizontal platform services

32. files
33. search
34. notifications
35. collaboration
36. configuration
37. feature flags
38. billing/metering
39. integrations
40. developer tooling
41. documentation

## Phase 5 — AI

42. model gateway
43. retrieval
44. tool registry
45. agent runtime
46. memory
47. guardrails
48. human approval
49. AI observability
50. evaluation framework
51. MCP adapter

## Phase 6 — Enterprise scale

52. deployment/ALM
53. environments
54. plugin marketplace
55. regional residency
56. advanced tenancy isolation
57. governance
58. data lineage
59. advanced analytics
60. disaster recovery

## Phase 7 — Domain packs

Only now accelerate:

- CRM
- ERP
- HR
- finance
- supply chain
- CMS
- commerce
- service management
- project management
- specialized vertical modules

---

# 122. The Critical Dependency Graph

The most important dependency chain is:

```text
IDENTITY
   ↓
TENANCY
   ↓
CONTEXT
   ↓
AUTHORIZATION / POLICY
   ↓
RESOURCE MODEL
   ↓
SCHEMA
   ↓
RELATIONSHIPS
   ↓
STATE / LIFECYCLE
   ↓
COMMAND / ACTION
   ↓
TRANSACTION
   ↓
EVENT
   ↓
WORKFLOW
   ↓
QUERY
   ↓
VIEW / UI
   ↓
ANALYTICS
   ↓
INTEGRATIONS
   ↓
AI
```

Cross-cutting all layers:

```text
AUDIT
OBSERVABILITY
LOCALIZATION
SECURITY
VERSIONING
GOVERNANCE
```

The most critical architectural mistake would be allowing these concerns to develop independently and later trying to connect them.

---

# 123. Minimal Core to Preserve at All Costs

If implementation pressure forces aggressive scope reduction, protect these first:

```text
Actor
Tenant
Context
Resource
Schema
Relationship
Policy
State
Action
Command
Transaction
Event
Workflow
Query
View
Metadata
Audit
Localization
```

Everything else can be temporarily implemented behind adapters.

---

# 124. Final Architectural Principle

The platform should behave as though every application is a **declarative graph of governed capabilities**.

Conceptually:

```text
               APPLICATION
                    |
        +-----------+-----------+
        |                       |
      DATA                    BEHAVIOR
        |                       |
  resources                 actions
  schemas                   commands
  relations                 rules
  metrics                   workflows
        |                       |
        +-----------+-----------+
                    |
                 GOVERNANCE
                    |
          identity / tenant /
         policy / audit /
         observability
                    |
                    v
               EXPERIENCE
                    |
       UI / mobile / API / AI
                    |
                    v
              INTEGRATIONS
```

The platform's long-term strategic advantage comes from this common substrate. The more consistent the primitive model becomes, the more applications can be built without introducing new infrastructure, security models, UI architectures or integration machinery.

---

# 125. Standards and Reference Sources

The following current specifications/reference sources should be maintained as part of architecture governance. Verify versions again before freezing an implementation baseline because standards evolve.

1. **HTML Living Standard — WHATWG**  
   https://html.spec.whatwg.org/

2. **Web Content Accessibility Guidelines (WCAG) 2.2 — W3C**  
   https://www.w3.org/TR/WCAG22/

3. **WAI-ARIA 1.2 — W3C**  
   https://www.w3.org/TR/wai-aria-1.2/

4. **Unicode Standard Annex #9 — Unicode Bidirectional Algorithm**  
   https://www.unicode.org/reports/tr9/

5. **Unicode Technical Standard #35 — Locale Data Markup Language / CLDR**  
   https://www.unicode.org/reports/tr35/

6. **BCP 47 / RFC 5646 — Tags for Identifying Languages**  
   https://www.rfc-editor.org/rfc/rfc5646

7. **IANA Time Zone Database**  
   https://www.iana.org/time-zones

8. **OpenAPI Specification 3.2.1**  
   https://spec.openapis.org/oas/v3.2.1.html

9. **AsyncAPI Specification**  
   https://www.asyncapi.com/docs/reference/specification/latest

10. **CloudEvents**  
    https://cloudevents.io/

11. **OpenTelemetry Specification**  
    https://opentelemetry.io/docs/specs/otel/

12. **W3C Trace Context**  
    https://www.w3.org/TR/trace-context/

13. **JSON Schema**  
    https://json-schema.org/specification

14. **OpenID Connect Core**  
    https://openid.net/specs/openid-connect-core-1_0.html

15. **OAuth Security Best Current Practice — RFC 9700**  
    https://www.rfc-editor.org/rfc/rfc9700

16. **SCIM — RFC 7644**  
    https://www.rfc-editor.org/rfc/rfc7644

17. **WebAuthn — W3C**  
    https://www.w3.org/TR/webauthn-3/

18. **Open Policy Agent**  
    https://www.openpolicyagent.org/docs/latest/

19. **OpenFGA**  
    https://openfga.dev/

20. **Vega-Lite**  
    https://vega.github.io/vega-lite/

21. **Model Context Protocol**  
    https://modelcontextprotocol.io/

22. **PostgreSQL Documentation**  
    https://www.postgresql.org/docs/

23. **OpenFeature**  
    https://openfeature.dev/

24. **Backstage Software Catalog**  
    https://backstage.io/docs/features/software-catalog/

---

# 126. Current Standards Notes Verified During Research

This blueprint intentionally uses current sources where date-sensitive details matter.

- The WHATWG HTML specification is a living standard; the currently surfaced specification was updated in October 2026.
- OpenAPI **3.2.1** was published on **2026-09-10** and is the current published 3.2 patch revision at the time of this document.
- Unicode UAX #9 is currently versioned as **Unicode 18.0.0** in the surfaced September 2026 publication.
- Unicode UTS #35 / CLDR surfaced as version **48.2** dated March 3, 2026.
- IANA's time-zone database surfaced release **2026e**, released September 29, 2026.
- WAI-ARIA 1.2 is a W3C Recommendation; ARIA 1.3 is under development.
- OpenTelemetry surfaced specification version **1.61.0**.
- CloudEvents 1.0 remains the stable foundational event-envelope specification.

These dates are included to make the document auditable; they are not substitutes for pinning exact dependency versions in implementation.

---

# 127. Final Definition

The resulting system should be understood as:

> **A universal application operating platform in which applications are governed graphs of resources, schemas, relationships, states, actions, commands, policies, workflows, queries, views, events, integrations and AI capabilities, all operating under shared identity, tenancy, localization, observability and governance.**

The strategic objective is not to make every application identical.

It is to make the **underlying mechanics of every application sufficiently universal that creating a new application becomes composition rather than reinvention.**

That is what turns:

```text
AI apps
Data apps
Dashboards
Internal tools
SaaS products
CRM
ERP
CMS
Commerce
Project management
Service platforms
IoT systems
AI agent platforms
Enterprise integration platforms
```

into variations of the same underlying platform.

---

# Appendix A — Universal Platform Capability Inventory

For architecture tracking, the following capability inventory should be treated as the master checklist.

```text
[ ] Runtime / compute abstraction
[ ] Application kernel
[ ] Metadata registry
[ ] Resource model
[ ] Actor model
[ ] Context model
[ ] Tenant model
[ ] Organization model
[ ] Workspace model
[ ] Authentication
[ ] MFA
[ ] OIDC
[ ] OAuth
[ ] SAML
[ ] SCIM
[ ] Passkeys / WebAuthn
[ ] RBAC
[ ] ABAC
[ ] ReBAC
[ ] Capability authorization
[ ] Resource permissions
[ ] Record permissions
[ ] Field permissions
[ ] Action permissions
[ ] Tenant isolation
[ ] Schema engine
[ ] Type system
[ ] Relationship engine
[ ] State machines
[ ] Rule engine
[ ] Command engine
[ ] Action engine
[ ] Transaction layer
[ ] Idempotency
[ ] Outbox/inbox
[ ] Event bus
[ ] Event replay
[ ] Workflow engine
[ ] Saga/compensation
[ ] Scheduler
[ ] Queueing
[ ] Query engine
[ ] Search engine
[ ] Semantic layer
[ ] Metrics engine
[ ] Visualization engine
[ ] Dashboard engine
[ ] Files
[ ] Documents
[ ] OCR/extraction
[ ] Content management
[ ] Notification engine
[ ] Collaboration
[ ] Localization
[ ] Translation management
[ ] Language registry
[ ] Locale registry
[ ] RTL/LTR
[ ] Bidi handling
[ ] Currency
[ ] Units
[ ] Time zones
[ ] Calendars
[ ] Responsive engine
[ ] Design system
[ ] Design tokens
[ ] Accessibility
[ ] UI component runtime
[ ] Form engine
[ ] Data-grid engine
[ ] Page builder
[ ] Workflow builder
[ ] Dashboard builder
[ ] App builder
[ ] API gateway
[ ] OpenAPI
[ ] AsyncAPI
[ ] Webhooks
[ ] Connector framework
[ ] Sync engine
[ ] Mapping engine
[ ] Integration health
[ ] Model gateway
[ ] AI retrieval
[ ] Tool registry
[ ] Agent runtime
[ ] Agent memory
[ ] AI guardrails
[ ] Human approval
[ ] AI evaluation
[ ] MCP
[ ] Configuration
[ ] Secrets
[ ] Feature flags
[ ] Entitlements
[ ] Billing/metering
[ ] Audit
[ ] Governance
[ ] Data classification
[ ] Data lineage
[ ] Data quality
[ ] Retention
[ ] Legal holds
[ ] Observability
[ ] Distributed tracing
[ ] Logs
[ ] Metrics
[ ] Resilience
[ ] Caching
[ ] Versioning
[ ] Migration engine
[ ] Environment management
[ ] ALM
[ ] Deployment
[ ] Plugin system
[ ] SDK
[ ] CLI
[ ] Developer catalog
[ ] Documentation generator
[ ] Testing framework
[ ] Contract testing
[ ] Domain packs
```

---

# Appendix B — Non-Negotiable Design Rules

```text
1. Security is enforced below the UI.
2. Every business action has an explicit contract.
3. Every meaningful mutation is auditable.
4. Significant state changes can emit events.
5. Long-running business processes use durable workflows.
6. AI uses the same policy/action system as humans.
7. Tenant isolation is foundational.
8. Localization exists in the core design system.
9. RTL/LTR is a first-class layout concern.
10. Responsive behavior is part of component contracts.
11. Accessibility is the default, not a project phase.
12. The system of record remains authoritative.
13. Domain modules use the shared primitives.
14. APIs and event contracts are versioned.
15. Physical infrastructure is replaceable through adapters.
16. Metadata is the canonical description of the application.
17. Code-first, declarative and AI-first creation converge on one runtime.
18. Observability crosses every major execution boundary.
19. Failure paths are designed at the same time as happy paths.
20. Anything declared as reusable should be a platform primitive, not copied into every application.
```

---

**End of blueprint.**
