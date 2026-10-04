# Widgetized Collaborative Workspace Architecture
## Dynamic Business Widgets, Typed Interaction, Cross-Widget Composition, Sharing, Collaboration, and AI-Native Application Surfaces

**Design baseline:** 2026-10-03  
**Related architecture:** Business Model Kernel, Core Data Architecture, Business IR, Local-First AI Runtime, Hermes Agent Runtime, User Functions, Capability Packages

---

# Executive Summary

The Workspace should be a **dynamic business application surface**, not a chat window with optional widgets attached.

Its fundamental unit of interaction should be the **Widget**.

A Widget is a self-contained, reusable, permission-aware business interaction surface that can contain one or more:

```text
conversation
input controls
data containers
reports
visualizations
forms
entity views
workflows
documents
actions
Functions
AI interaction
collaboration
```

The Widget can operate independently:

```text
Widget
   ↓
its own purpose
its own inputs
its own outputs
its own state
its own actions
```

while still participating in a larger Workspace:

```text
Workspace
   ├── Widget A
   ├── Widget B
   ├── Widget C
   └── Widget D
```

The critical architectural rule is:

> **Widgets are interaction islands, not data islands.**

A widget may own its interaction state and presentation, but it must reference the canonical Business Model, canonical entities, governed Functions/Queries/Commands, authorization system, and shared workspace context.

The architecture should support:

```text
independent widget use
+
cross-widget composition
+
cross-workspace reuse
+
cross-conversation references
+
live synchronized instances
+
collaborative editing
+
human + AI participation
+
deterministic business execution
```

The preferred reference syntax should be:

```text
@person / @agent
#widget / #function / #document / #workspace / #report
```

That keeps `@` aligned with people/agents and `#` aligned with reusable business objects.

A Widget can therefore be:

```text
independent
```

when opened directly,

or:

```text
collectively connected
```

when embedded or referenced by other widgets, conversations, workspaces, documents, Functions, workflows, or agents.

This document defines the recommended architecture.

---

# Part I — Architectural thesis

# 1. The Workspace is not Chat

The previous architecture established that a Workspace should contain multiple interaction types.

The widget architecture takes that one step further.

Instead of:

```text
Workspace
 ├── Chat
 ├── Table
 ├── Form
 ├── Chart
 └── Document
```

make:

```text
Workspace
    ↓
Widget Runtime
    ↓
Widgets
```

Each widget can internally contain whatever combination of interaction primitives its purpose requires.

This prevents the platform from becoming a giant collection of special-case UI features.

---

# 2. Widget as the primary interaction unit

A Widget should represent a coherent activity.

Examples:

```text
Customer Investigation
Accounts Receivable
Quarterly Sales
Supplier Risk
Inventory Availability
Purchase Approval
Budget Review
Project Status
Employee Onboarding
Contract Review
```

A widget may be as small as:

```text
Revenue Metric
```

or as large as:

```text
Complete Collections Desk
```

The important property is not its size.

The important property is:

> **A widget has a coherent purpose and an explicit contract.**

---

# 3. Widget versus traditional UI component

A traditional UI component is generally a visual building block:

```text
button
table
input
chart
```

A Widget is a business interaction object.

For example:

```text
Customer Investigation Widget
```

may contain:

```text
Customer selector
Customer summary
Invoice table
Payment timeline
Risk chart
Conversation
Create-task action
```

Those are ordinary UI components inside a single business Widget.

---

# 4. Widget versus module

A traditional ERP module is usually a large collection of:

```text
database tables
screens
reports
services
workflows
permissions
```

A Widget is much smaller.

A Widget is:

```text
purpose
+
interaction
+
data references
+
optional execution
```

A Capability/Module remains a business-domain boundary.

Widgets are the **runtime interaction surface for capabilities**.

Therefore:

```text
Capability
   ↓
Functions / Commands / Queries
   ↓
Widgets
   ↓
Workspace
```

---

# Part II — Widget architecture principles

# 5. Principle: isolation of interaction, not isolation of truth

A Widget may own:

```text
filters
selection
draft values
collapsed sections
layout
local conversation
temporary state
```

But it must not own an independent authoritative copy of:

```text
Customer
Invoice
Product
Employee
Payment
Organization
```

The canonical business model remains shared.

---

# 6. Principle: typed contracts

Every Widget should declare:

```text
inputs
outputs
actions
events
dependencies
permissions
state
collaboration support
persistence
```

No widget should need to guess how another widget works.

---

# 7. Principle: semantic UI, not model-generated UI code

AI should produce a semantic Widget definition:

```text
data grid of customers
+
filters for country and balance
+
open customer action
```

It should not generate:

```text
React component source code
```

unless the user is explicitly working in a developer environment.

The Workspace renderer converts semantic Widget IR into the actual UI.

---

# 8. Principle: shared business model

Widgets consume:

```text
entities
fields
relationships
metrics
Functions
Commands
Workflows
Policies
```

from the Business Model Kernel.

They do not create isolated business semantics.

---

# 9. Principle: direct use and composition must both work

The same Widget should be able to:

```text
open directly
```

and:

```text
embed inside another Widget
embed in another Workspace
reference inside a conversation
send into another conversation
appear in a dashboard
be scheduled
be shared
be copied/forked
```

without creating unrelated copies of its underlying business logic.

---

# Part III — Widget contract

# 10. Widget definition

A conceptual Widget definition:

```yaml
widget:
  id: widget_customer_investigation
  version: 1.0

  purpose:
    "Investigate the financial relationship with a customer."

  inputs:
    - customer
    - date_range

  outputs:
    - customer_summary
    - invoices
    - payment_history

  actions:
    - open_customer
    - open_invoice
    - create_collection_task

  events:
    emits:
      - customer.selected
      - invoice.selected

    consumes:
      - customer.changed
      - date_range.changed

  dependencies:
    entities:
      - Customer
      - Invoice
      - Payment

    metrics:
      - overdue_balance

    commands:
      - create_collection_task

  permissions:
    - customer.read
    - invoice.read
    - payment.read

  collaboration:
    supported: true

  persistence:
    type: workspace_object
```

The exact serialization format is an implementation decision.

The contract is the architectural requirement.

---

# 11. Widget inputs

Inputs may come from:

```text
user-entered values
Function parameters
workspace context
selected records
other widget outputs
URL/deep link
saved state
AI proposal
scheduled execution
```

Examples:

```text
CustomerRef
DateRange
Currency
OrganizationRef
ProductRef
Boolean
Number
Text
FilterSet
RecordSelection
```

---

# 12. Widget outputs

Outputs should be typed.

Examples:

```text
CustomerRef
InvoiceRef[]
MetricResult
TableResult
ChartData
Report
DocumentRef
FunctionResult
WorkflowRef
Task[]
```

The widget should not expose arbitrary frontend implementation state as its primary output.

---

# 13. Widget actions

Actions are user or system operations.

Examples:

```text
refresh
filter
select
open
edit
execute_function
execute_command
start_workflow
share
save
comment
```

Actions must resolve through the appropriate platform layer.

---

# 14. Widget events

Events create loose coupling.

Examples:

```text
customer.selected
invoice.selected
product.selected
period.changed
filter.changed
function.executed
record.updated
document.selected
workflow.started
task.created
```

A widget can subscribe to relevant events without knowing the internal implementation of the producer.

---

# 15. Widget dependencies

A widget must declare dependencies on:

```text
entities
fields
relationships
metrics
Functions
Commands
Workflows
Policies
Knowledge
Skills
other widgets
```

This feeds into the platform's dependency graph.

---

# Part IV — Widget types

# 16. Atomic widgets

Useful building blocks:

```text
Metric
Text
Input
Button
Status
Badge
Reference
```

---

# 17. Data widgets

Examples:

```text
DataGrid
EntityList
EntityView
Timeline
Calendar
Kanban
Tree
Graph
Map
```

---

# 18. Analytical widgets

Examples:

```text
Metric Card
Pivot Table
Chart
Trend
Funnel
Cohort
Waterfall
KPI Board
Anomaly View
Comparison
```

These should consume canonical Metrics and semantic query results.

---

# 19. Functional widgets

Examples:

```text
Customer Investigation
Purchase Approval
Inventory Transfer
Collections Desk
Expense Submission
Payment Review
Contract Review
```

These can combine:

```text
data
inputs
commands
workflow
AI
```

---

# 20. Communication widgets

Examples:

```text
Conversation
Comments
Discussion
Activity Feed
Decision Log
Mentions
Task Discussion
```

---

# 21. Document widgets

Examples:

```text
Document
PDF viewer
Document editor
Document comparison
Annotated document
Evidence panel
```

---

# 22. Collaboration widgets

Examples:

```text
Shared Notes
Decision Board
Task Board
Approval Panel
Live Review
Annotation
```

---

# 23. Structural widgets

Examples:

```text
Tabs
Split Pane
Stack
Container
Grid Layout
Section
Accordion
Dock
```

These are composition primitives rather than business widgets.

---

# Part V — Widget state model

# 24. Three state levels

A Widget participates in three distinct state layers.

### Local Widget State

```text
filters
sorting
selection
draft values
expanded sections
temporary UI state
```

### Shared Workspace State

```text
active customer
selected date range
workspace context
shared filters
participant context
shared selections
```

### Business State

```text
invoice.status
customer.credit_limit
inventory.quantity
purchase_order.approved
```

Business state is owned by the Business Platform.

---

# 25. Never confuse draft state with business state

For example:

```text
Credit limit input = €100,000
```

does not mean:

```text
Customer.credit_limit = €100,000
```

until a valid business Command executes.

---

# 26. Widget state serialization

Persistent Widgets should store:

```text
widget_instance_id
widget_definition_id
widget_version
state_version
layout_state
parameter_values
selection
workspace_context_bindings
```

But avoid storing authoritative business data in the Widget.

---

# 27. Live state vs snapshot state

A Widget may be:

```text
LIVE
```

or:

```text
SNAPSHOT
```

A live widget resolves its data source when opened/refreshed.

A snapshot widget preserves historical state.

This distinction must be visible in the UI.

---

# Part VI — Widgets and Functions

# 28. Function is behavior; Widget is interaction

This should become a core conceptual rule:

```text
Function
    =
"What operation should happen?"

Widget
    =
"How should a human interact with that operation?"
```

---

# 29. Function-to-widget relationship

Example:

```text
Function:
Overdue Customers

    ↓

Widget:
Overdue Customers Review
```

The Function can be executed independently.

The Widget supplies:

```text
inputs
presentation
interaction
actions
```

---

# 30. Function without Widget

A Function can appear as:

```text
button
command
scheduled job
API operation
automation
```

without a dedicated Widget.

---

# 31. Widget without Function

A pure read-only Widget may query a canonical View or Entity directly.

Example:

```text
Customer Profile Widget
```

---

# 32. Widget with multiple Functions

Example:

```text
Collections Widget

Functions:
    overdue_customers
    create_collection_task
    register_payment
    send_reminder
```

---

# Part VII — Widget IR

# 33. Why Widget IR is necessary

We already have:

```text
Business IR
```

for business intent.

We need:

```text
Widget IR
```

for workspace composition.

Business IR:

> What should the business system do?

Widget IR:

> What should the workspace present and how should the user interact with it?

---

# 34. Example Widget IR

```json
{
  "widget": {
    "type": "data_grid",
    "title": "Overdue Customers",
    "source": {
      "function": "fn_overdue_customers"
    },
    "inputs": [
      {
        "id": "country",
        "type": "Country",
        "control": "entity_picker"
      },
      {
        "id": "minimum_balance",
        "type": "Money",
        "control": "money_input"
      }
    ],
    "actions": [
      "open_customer",
      "create_collection_task"
    ]
  }
}
```

The renderer maps this to the actual frontend.

---

# 35. Widget IR should remain semantic

Do not encode:

```text
React props
CSS classes
DOM structure
browser-specific implementation
```

unless the Widget is explicitly a developer component.

---

# Part VIII — Widget composition

# 36. Composition model

A Widget can contain child Widgets:

```text
Customer Investigation
    ├── Customer Summary
    ├── Invoice Grid
    ├── Payment Timeline
    ├── Risk Chart
    └── Collection Task Panel
```

This creates a widget tree.

---

# 37. Widget graph

A Workspace should also have a graph of relationships:

```text
Widget A
   │
   │ produces
   ▼
Widget B
   │
   │ filters
   ▼
Widget C
```

The tree represents visual composition.

The graph represents behavioral relationships.

These are not necessarily the same structure.

---

# 38. Typed widget ports

A Widget may define:

```text
INPUT PORTS
OUTPUT PORTS
EVENT PORTS
ACTION PORTS
```

Example:

```text
Customer Widget

Input:
    CustomerRef

Outputs:
    CustomerRef
    CustomerContext

Events:
    customer.selected

Actions:
    open
    edit
```

---

# 39. Widget binding

Another Widget can bind to:

```text
CustomerWidget.customer.selected
```

Example:

```text
Customer Widget
       │
       │ customer.selected
       ▼
Invoice Widget
       │
       │ invoice.selected
       ▼
Payment Widget
```

This is a typed visual dataflow.

---

# 40. Binding must use canonical references

A Widget should not pass raw arbitrary JSON when a canonical business object exists.

Prefer:

```text
CustomerRef(customer_id)
```

over:

```json
{
  "name": "ACME",
  "country": "Germany"
}
```

The latter is only useful as a derived display projection.

---

# 41. Cross-widget communication

Preferred communication mechanisms:

```text
direct typed port
workspace event
shared context binding
Function result
canonical object reference
```

Avoid arbitrary widget-to-widget scripting as the normal mechanism.

---

# Part IX — Independent widget usage

# 42. A Widget must be addressable independently

Every reusable Widget should have a stable URI/reference:

```text
workspace://tenant/widget/widget_customer_investigation/1
```

The exact URI syntax is an implementation detail.

The architectural requirement is:

> A Widget is a first-class addressable object.

---

# 43. Open Widget

A user can click:

```text
My Widgets
 → Customer Investigation
```

and open it without opening the original Workspace.

---

# 44. Embed Widget

The same Widget can appear in:

```text
Finance Workspace
Customer Workspace
Collections Workspace
Dashboard
Conversation
Document
```

---

# 45. Share Widget

A user can share:

```text
#overdue-customers
```

inside another conversation.

The receiving interface can render the Widget inline.

---

# 46. Widget references should be live by default

When a Widget is referenced elsewhere, the default should be:

```text
live linked instance
```

not:

```text
copied static data
```

unless the user chooses Snapshot/Copy.

This is strongly supported by existing collaboration patterns such as Microsoft Loop's live components and Notion synced blocks: the same reusable content can appear in multiple places while remaining synchronized. citeturn137091search0turn137091search1turn137091search2

---

# 47. Three reference modes

A shared Widget should support:

### LINK

Same underlying Widget object.

```text
all instances reflect changes
```

### INSTANCE

New instance of the same Widget definition.

```text
same behavior
different parameters/state
```

### SNAPSHOT

Frozen representation.

```text
no live synchronization
```

This distinction is essential.

---

# Part X — Cross-conversation referencing

# 48. Recommended syntax

Use:

```text
@person
@agent
```

for participants.

Use:

```text
#widget
#function
#workspace
#document
#report
#task
```

for reusable platform objects.

This is cleaner than using one symbol for everything.

---

# 49. Why `#` for objects

`@` already naturally means:

```text
person
agent
group
participant
```

`#` can represent:

```text
named reusable object
```

Example:

```text
@Sarah review #supplier-risk with @FinanceAgent
```

---

# 50. Object autocomplete

Typing:

```text
#
```

should open a context-aware picker:

```text
Widgets
Functions
Reports
Documents
Workspaces
Tasks
Views
Dashboards
```

Typing:

```text
@
```

should show:

```text
People
Agents
Teams
Groups
```

Permission filtering occurs before objects are displayed.

---

# 51. Referencing a Widget inside chat

Example:

```text
"Can you compare #overdue-customers with #supplier-risk?"
```

The AI gets:

```text
Widget references
+
their semantic definitions
+
current parameters/selection
```

not raw frontend implementation.

---

# 52. Referencing in another Widget

A Widget can consume another:

```text
#customer-risk
```

as:

```text
input
data source
context
filter
linked object
```

---

# Part XI — Collaborative Widgets

# 53. Collaboration should exist at three levels

### Workspace collaboration

People collaborate across the whole Workspace.

### Widget collaboration

People collaborate around one Widget.

### Object collaboration

Comments/decisions/tasks can attach to specific data or content.

---

# 54. Human + AI participants

Participants can be:

```text
Person
Agent
```

Example:

```text
Procurement Workspace

@Sarah
@John
@ProcurementAgent
```

---

# 55. Presence

The Workspace can show:

```text
Sarah viewing Purchase Order PO-1042
John editing supplier filter
Procurement Agent analyzing spend
```

Presence is a collaboration feature, not business authorization.

---

# 56. Comments

Comments should be anchorable to:

```text
Widget
row
cell
chart
chart point
form field
document paragraph
conversation message
Function
workflow step
business record
```

Figma's comments demonstrate the usefulness of anchoring discussion to specific regions/objects, while Notion supports page-level and inline discussion. citeturn137091search3turn137091search7

---

# 57. @mentions in collaboration

Use:

```text
@Sarah
@FinanceAgent
@ProcurementTeam
```

inside:

```text
comments
widget discussions
workspace messages
tasks
decision records
```

This aligns with existing collaboration conventions such as Figma/Notion and Microsoft Loop. citeturn137091search4turn137091search5

---

# 58. Collaborative Widget versus collaborative business state

This distinction is critical.

Users can collaborate on:

```text
filters
notes
layout
annotations
discussion
draft values
```

using collaborative document/canvas mechanisms.

Business records still change through:

```text
Business Command
+
authorization
+
transaction
```

Do not use generic collaborative merging as the authority for financial/operational state.

---

# Part XII — Concurrency model

# 59. Two synchronization classes

### Collaborative state

Use a real-time collaboration mechanism appropriate for concurrent editing:

```text
CRDT
OT
or another collaborative state engine
```

for:

```text
documents
notes
layout
annotations
comments
```

### Business state

Use transactional concurrency:

```text
version
optimistic locking
business command
transaction
postcondition
```

for:

```text
invoice
inventory
payments
purchase orders
employees
```

---

# 60. Avoid last-write-wins for critical business data

If two users modify:

```text
PurchaseOrder.total
```

or:

```text
Customer.credit_limit
```

the business engine must resolve the change through domain rules.

Not:

```text
last HTTP request wins
```

---

# Part XIII — Live synchronization

# 61. Live Widgets should remain connected

If:

```text
#overdue-customers
```

appears in:

```text
Workspace A
Conversation B
Dashboard C
```

all references can point to the same Widget definition.

A shared live Widget should reflect:

```text
current parameters
current state
current data
current version
```

according to its sharing contract.

Microsoft Loop demonstrates a similar "portable component that stays in sync" model. citeturn137091search1turn137091search8

---

# 62. Live does not mean every instance has identical state

Two instances can have different parameters:

```text
Widget A
country = Sweden

Widget B
country = Germany
```

while sharing:

```text
same Widget definition
```

This is why we distinguish:

```text
Widget Definition
```

from:

```text
Widget Instance
```

---

# 63. Widget Definition versus Widget Instance

### Definition

```text
what the Widget is
```

### Instance

```text
how this particular placement is configured
```

This is analogous to the distinction between reusable components and instances in design systems. Figma's component model uses a main component as the definition and reusable instances in designs. citeturn137091search11

---

# Part XIV — Widget library

# 64. Library should be a user experience, not the underlying architecture

The architecture should contain:

```text
Object Registry
```

and the UI can expose:

```text
Library
```

through which users browse:

```text
Widgets
Functions
Reports
Documents
Workspaces
Dashboards
Templates
Views
```

---

# 65. Widget Library categories

```text
System
Capability
Organization
Team
Personal
Shared with me
AI-created
Recently used
Favorites
```

---

# 66. Widget metadata in the Library

Show:

```text
name
description
owner
version
live/snapshot
permissions
dependencies
AI requirement
last updated
last used
```

---

# 67. Search the Library semantically

A user could type:

```text
"customer collections"
```

and retrieve:

```text
Overdue Customers
Collections Review
Customer Risk
Cash Exposure
```

but the final references are canonical object IDs.

---

# Part XV — Widget lifecycle

# 68. Widget lifecycle

```text
DRAFT
  ↓
VALIDATED
  ↓
PUBLISHED
  ↓
ACTIVE
  ↓
DEPRECATED
  ↓
ARCHIVED
```

---

# 69. AI-generated Widgets

An AI-generated Widget starts as:

```text
proposal
```

not live production functionality.

The user can:

```text
review
edit
test
publish
```

---

# 70. Forking

A user can:

```text
Fork #system-revenue-widget
```

and create:

```text
My Revenue Widget
```

with inherited dependencies.

---

# 71. Override model

Allow controlled overrides:

```text
title
layout
filters
default parameters
visible columns
actions
placement
```

Avoid copying underlying business logic when possible.

---

# 72. Widget inheritance

Conceptually:

```text
System Widget
      ↓
Organization Widget
      ↓
Team Widget
      ↓
Personal Widget
```

Each layer can override permitted presentation/interaction properties.

---

# Part XVI — Widget permissions

# 73. Widget permissions

Widget-level permissions might be:

```text
view
interact
edit
configure
execute
comment
share
publish
```

---

# 74. Business permissions remain underneath

If a Widget exposes:

```text
ChangeCreditLimit
```

the Widget cannot grant that ability.

The Business Platform verifies:

```text
user
tenant
role
policy
record
threshold
workflow state
```

every time.

---

# Part XVII — Widget AI

# 75. Global Workspace Agent

Understands:

```text
workspace goal
widget relationships
participants
shared context
```

---

# 76. Widget Agent

Understands:

```text
widget purpose
inputs
outputs
actions
current selection
local context
```

---

# 77. Specialist Agent

Understands:

```text
business capability
```

Examples:

```text
Finance Agent
Inventory Agent
HR Agent
```

Hermes can provide the runtime for these agents, while the Business Platform provides their capabilities and authorization.

---

# 78. Widget AI should not mutate its Widget contract autonomously

AI may propose:

```text
add a chart
add an input
change a filter
```

as a:

```text
Widget Patch Proposal
```

The platform validates/publishes the change.

---

# Part XVIII — Workspace Patch model

# 79. Workspace Patch

Define a structured patch language:

```text
ADD_WIDGET
REMOVE_WIDGET
MOVE_WIDGET
RESIZE_WIDGET
UPDATE_WIDGET
SET_PARAMETER
SET_SELECTION
BIND_WIDGET
UNBIND_WIDGET
ADD_REFERENCE
ADD_COMMENT
CREATE_TASK
PROPOSE_FUNCTION
```

---

# 80. AI uses patches, not frontend code

Example:

```json
{
  "operation": "ADD_WIDGET",
  "widget_type": "chart",
  "source": {
    "function": "fn_revenue_by_country"
  },
  "placement": {
    "after": "widget_sales_table"
  }
}
```

The Workspace Runtime validates and applies it.

---

# 81. Workspace patches are collaborative operations

If two people are editing:

```text
Workspace A
```

their patch operations can be synchronized through the collaboration layer.

Business actions still go through business transactions.

---

# Part XIX — Data interaction inside widgets

# 82. DataGrid modes

At minimum:

```text
read-only result
live entity view
editable command-backed grid
import/review grid
approval grid
```

---

# 83. Editable grid

Editing a cell should produce:

```text
Business Command Proposal
```

or direct command execution if the action is safely configured.

Never:

```text
UPDATE table
```

as the conceptual model.

---

# 84. Selection propagation

A selected row should expose:

```text
canonical EntityRef
```

to the Workspace context.

Example:

```text
CustomerRef(customer_123)
```

Then other widgets can consume it.

---

# 85. Tree widgets

Interactive trees are particularly useful for:

```text
organization hierarchy
account hierarchy
product categories
chart of accounts
project structure
permissions
workflow
BOM
```

The tree should be generated from canonical relationships, not manually duplicated hierarchy data.

---

# 86. Graph widgets

Graph views can show:

```text
customer → orders → invoices → payments
```

or:

```text
entity → metric → function → widget
```

The graph is a projection of the canonical relationship/dependency graph.

---

# Part XX — Analytical widgets

# 87. Analytical Widget architecture

Analytical widgets should use:

```text
Metric
+
Business Query IR
+
Data Projection
+
Presentation definition
```

---

# 88. Active analytics

An analytical widget should not merely display a static chart.

It can support:

```text
filter
drilldown
select point
compare period
change dimension
open source record
ask AI
save Function
share
```

---

# 89. Drilldown

Clicking:

```text
Germany
```

should produce:

```text
CountryRef(DE)
```

and propagate it through Workspace context.

Another widget can immediately update.

---

# 90. Cross-filtering

Example:

```text
Revenue Chart
      │
      │ country.selected
      ▼
Customer Table
      │
      │ customer.selected
      ▼
Invoice Table
```

This is exactly the type of collective behavior the widget model should enable.

---

# Part XXI — Widget references in conversations

# 91. General chat as a super-workspace

A general chat can itself support:

```text
#widget
#report
#function
#document
#workspace
```

inline.

It does not need to become a separate world.

---

# 92. Conversation can create Widgets

User:

> "Build me a supplier risk view."

AI:

```text
Widget proposal
```

User:

```text
Publish
```

The Widget becomes reusable in the Library.

---

# 93. Conversation can consume Widgets

User:

> "Compare #supplier-risk with #cash-exposure."

The AI retrieves their structured definitions/results.

---

# 94. Conversation can transform Widgets

User:

> "Take #quarterly-sales and add a customer segment filter."

AI creates:

```text
Widget Patch
```

or:

```text
Fork
```

depending on the user's choice.

---

# Part XXII — Documents and bookmarks

# 95. Widget-aware references

Users can bookmark:

```text
Widget
Widget region
Widget row
Widget chart point
Widget output
Widget discussion
```

---

# 96. Reference object

A reference should contain:

```text
reference_id
source_type
source_id
source_version
location
selection
creator
created_at
workspace
```

---

# 97. Save Widget output as Document

A user can take:

```text
Widget output
```

and:

```text
Save as Document
```

The document retains:

```text
source Widget
source Function
source model version
data timestamp
filters
```

This preserves provenance.

---

# Part XXIII — Collaborative workspace architecture

# 98. Workspace participants

A Workspace can have:

```text
people
agents
teams
groups
```

with roles:

```text
owner
editor
contributor
commenter
viewer
```

---

# 99. Widget participants

Individual Widgets can optionally have narrower sharing:

```text
private
workspace members
specific people
specific team
public within tenant
```

---

# 100. Shared Widget across multiple Workspaces

A Widget can be shared:

```text
Workspace A
Workspace B
Conversation C
Dashboard D
```

without copying the underlying Function/business logic.

---

# 101. Cross-location synchronization

If the Widget definition changes:

```text
all live references
```

should see the new published version subject to version and compatibility policy.

---

# 102. But version pinning is required

A user can pin:

```text
Widget v3
```

for a report or historical workspace.

This is useful for reproducibility.

---

# Part XXIV — Real-time activity

# 103. Activity feed

The Workspace should show:

```text
Sarah added #supplier-risk
John filtered by Germany
Finance Agent completed analysis
Alex commented on row 14
Sarah published Widget v2
```

---

# 104. Activity should distinguish intent from business effects

Example:

```text
John changed a filter
```

is not equivalent to:

```text
John changed a customer's credit limit
```

The latter is a business event.

---

# 105. Audit versus activity

Maintain separate semantics:

```text
Activity Feed
    human-friendly collaboration history

Audit Trail
    authoritative security/business record
```

---

# Part XXV — Widget dependency graph

# 106. Widget dependencies

A Widget may depend on:

```text
Function
Metric
Entity
Command
Workflow
Policy
Other Widget
```

---

# 107. Example dependency chain

```text
Customer Risk Widget
        │
        ├── Function: customer_risk
        │       │
        │       ├── Metric: overdue_balance
        │       ├── Metric: order_decline
        │       └── Customer entity
        │
        ├── Command: create_collection_task
        │
        └── Policy: collections_access
```

---

# 108. Schema change propagation

If:

```text
Customer.risk_tier
```

changes:

```text
Dependency Engine
```

finds:

```text
Widgets
Functions
Skills
Reports
Queries
Commands
```

that depend on it.

The Widget is:

```text
valid
recompiled
needs review
invalid
```

depending on impact.

---

# Part XXVI — Widget evolution

# 109. Safe Widget changes

Often safe:

```text
layout
title
icon
non-semantic styling
```

---

# 110. Review-required Widget changes

```text
new business dependency
new command
new permission
new metric
new external integration
```

---

# 111. Breaking Widget changes

```text
removed required input
removed output port
changed semantics
changed Function
changed authorization
```

These require explicit compatibility handling.

---

# Part XXVII — Widget registry

# 112. Workspace Object Registry

Widgets should be first-class registry objects:

```text
object_type = widget
object_id
version
owner
scope
status
dependencies
permissions
```

---

# 113. Shared object identity

The same Widget referenced in five places still has one canonical identity:

```text
widget_id
```

Instances have:

```text
widget_instance_id
```

---

# 114. Object graph

The Registry should be able to answer:

```text
Where is this Widget used?
What does it depend on?
Which Functions use this Widget?
Which Workspaces contain it?
Which conversations reference it?
Which users have access?
```

---

# Part XXVIII — Widget package architecture

# 115. Widget package

A reusable advanced Widget could be packaged as:

```text
widget/
├── manifest
├── widget definition
├── child widgets
├── Business IR references
├── Functions
├── UI schema
├── collaboration schema
├── permissions
├── documentation
├── tests
└── assets
```

---

# 116. Widget packages should not duplicate business truth

Dependencies should reference:

```text
canonical entities
canonical metrics
canonical commands
```

instead of copying them.

---

# Part XXIX — AI generation lifecycle

# 117. Generate Widget

```text
User request
   ↓
Hermes
   ↓
Business intent
   ↓
Business IR
   ↓
Result requirements
   ↓
Widget IR
```

---

# 118. Validate Widget

```text
entities valid
metrics valid
commands valid
permissions valid
ports valid
dependencies valid
```

---

# 119. Preview

Render the Widget in a sandbox with:

```text
test data
```

No production mutation.

---

# 120. Publish

After approval:

```text
Widget v1
```

is added to the registry.

---

# Part XXX — Widget sandbox

# 121. Why a sandbox is necessary

AI-generated Widgets may contain:

```text
incorrect dependency
wrong metric
wrong parameter
bad layout
unauthorized action
```

Preview before publication.

---

# 122. Sandbox data

Use:

```text
synthetic
masked
read-only
```

data where possible.

---

# Part XXXI — Widget runtime security

# 123. Widgets cannot grant permissions

A Widget may request:

```text
invoice.cancel
```

but the platform decides whether it can execute.

---

# 124. Widget trust levels

```text
SYSTEM
FIRST_PARTY
TENANT
PERSONAL
UNTRUSTED
```

External/custom Widgets should have restricted capabilities.

---

# 125. Widget external integrations

A Widget that talks to an external service must declare:

```text
integration
data leaving platform
credentials
permissions
```

---

# Part XXXII — Widget collaboration and AI context

# 126. What the AI should receive

For a Widget task:

```text
widget purpose
widget version
current inputs
selected business objects
relevant outputs
relevant events
allowed actions
business model version
```

Not:

```text
entire workspace DOM
```

---

# 127. Workspace Agent context

For a cross-widget request:

```text
workspace goal
active widget
selected widgets
shared references
participants
relevant widget graph
```

---

# 128. Keep context compact

This architecture is favorable for local models because:

```text
Widget metadata
+
typed references
+
small results
```

are far cheaper than sending the full workspace state.

---

# Part XXXIII — Widget lifecycle in collaboration

# 129. Collaborative Widget editing

For Widget configuration:

```text
draft
edit
comment
review
publish
```

---

# 130. Operational Widget execution

For business actions:

```text
propose
authorize
execute
verify
audit
```

These are distinct lifecycles.

---

# Part XXXIV — Active analytical and functional examples

# 131. Example: Collections workspace

```text
Workspace: Collections

Widgets:
  #overdue-customers
  #customer-risk
  #payment-timeline
  #collection-task
  #collection-conversation
```

Interactions:

```text
select customer
   ↓
all relevant widgets filter
```

---

# 132. Example: Management review

```text
Workspace: Weekly Management Review

Widgets:
  Revenue
  Gross Margin
  Cash
  AR Aging
  Sales Pipeline
  AI Analysis
  Decisions
  Tasks
```

---

# 133. Example: Procurement

```text
Workspace: Procurement Desk

Widgets:
  Supplier Search
  Spend Analysis
  Open Purchase Orders
  Approval Queue
  Supplier Risk
  Contract Documents
  Procurement Agent
```

---

# 134. Example: Product structure

```text
Product Widget
   │
   ├── Product details
   ├── BOM Tree
   ├── Inventory
   ├── Orders
   └── Cost analysis
```

The tree and analytics are projections from canonical relationships.

---

# Part XXXV — Widget-driven low-code / no-code evolution

# 135. Traditional low-code

```text
drag components
connect fields
configure actions
```

---

# 136. AI-native widget construction

```text
Describe goal
   ↓
AI proposes Widget graph
   ↓
user reviews
   ↓
publish
```

---

# 137. Advanced user workflow

A user can say:

> Build me a workspace for reviewing overdue customers.

The system may produce:

```text
Collections Widget
Customer Grid
Risk Chart
Payment Timeline
Collection Task Widget
AI Investigation Widget
```

The user can rearrange and save.

---

# Part XXXVI — Widget reuse across the organization

# 138. Personal to organizational promotion

A useful lifecycle:

```text
Personal Widget
      ↓
Team Widget
      ↓
Organization Widget
      ↓
Platform Capability
```

Repeated useful Widgets can eventually become standard vendor features.

---

# 139. But promotion must preserve dependencies

Before promoting:

```text
personal Widget
```

into:

```text
system capability
```

the platform analyzes:

```text
tenant-specific fields
tenant-specific Functions
tenant permissions
external integrations
```

and replaces them with generalized contracts where possible.

---

# Part XXXVII — Widget observability

# 140. Runtime telemetry

Track:

```text
widget opens
refreshes
actions
errors
latency
queries
Function calls
AI calls
```

---

# 141. AI cost telemetry

A Widget should report:

```text
AI required?
model
tokens
latency
```

A deterministic Widget should show:

```text
AI calls = 0
```

where appropriate.

---

# Part XXXVIII — Widget quality and testing

# 142. Widget tests

Each Widget should have:

```text
render test
input validation
permission test
data contract test
dependency test
action test
collaboration test
accessibility test
```

---

# 143. Business correctness

If a Widget displays:

```text
Overdue Balance
```

it is tested against:

```text
canonical metric
```

not against manually written UI expectations only.

---

# 144. Collaboration tests

Test:

```text
two users edit
user opens while another changes
widget referenced in two workspaces
permission changes
Widget version changes
```

---

# Part XXXIX — Accessibility and responsive rendering

# 145. Widget should describe semantics, not only appearance

The Widget IR should allow renderers to adapt for:

```text
desktop
tablet
mobile
keyboard
screen reader
voice
```

---

# 146. Responsive Widget behavior

A large:

```text
DataGrid
```

may become:

```text
card list
```

on mobile.

Same Widget semantics.

---

# Part XL — Widget deep links

# 147. Stable references

Users should be able to open:

```text
#supplier-risk
```

directly.

---

# 148. Deep links with context

A reference may encode:

```text
widget
instance
parameters
selected object
workspace
```

so:

```text
#supplier-risk[Supplier=ACME]
```

can open the appropriate contextual state.

Do not expose internal database IDs to users unless useful.

---

# Part XLI — Workspace navigation

# 149. Workspace can contain widget tabs

Example:

```text
Collections
 ├── Overview
 ├── Customers
 ├── High Risk
 └── Team Review
```

Each tab is a view over the Widget graph.

---

# 150. Widget dock

Users can keep favorite Widgets available:

```text
#cash
#ar
#sales
#tasks
```

This starts to resemble a personal business command center.

---

# Part XLII — Widget and document interop

# 151. Insert Widget into Document

A report can contain a live Widget:

```text
Management Report
    ↓
#revenue-chart
#sales-table
```

Users can choose:

```text
live
snapshot
```

---

# 152. Insert Widget into conversation

A conversation message can contain:

```text
#supplier-risk
```

inline.

Recipients can interact with the Widget according to permissions.

---

# 153. Insert conversation into Widget

A Widget may contain:

```text
Discussion
```

which persists as a child object.

This avoids forcing all context into one giant thread.

---

# Part XLIII — Widget and workflow interop

# 154. Widget can show workflow state

Example:

```text
Purchase Approval Widget
```

displays:

```text
Draft
→ Submitted
→ Finance Review
→ Approved
→ Ordered
```

---

# 155. Workflow can invoke a Widget

A human task could open:

```text
#purchase-approval
```

for the assigned user.

---

# 156. Widget action can launch workflow

```text
[Start Approval]
```

calls a canonical Workflow.

---

# Part XLIV — Widget and agent interop

# 157. Widget can call AI

Example:

```text
Risk Widget
[Ask Finance Agent]
```

The Agent receives:

```text
widget context
```

not the entire workspace.

---

# 158. Agent can create/update Widgets

Through:

```text
Widget IR
Workspace Patch
```

not direct browser manipulation.

---

# 159. Agent can be embedded as a Widget

Example:

```text
Finance Agent Widget
```

contains:

```text
conversation
active task
tools
analysis
Function suggestions
```

---

# Part XLV — Widget and User Functions together

# 160. The most important reusable chain

```text
AI request
    ↓
Business IR
    ↓
result
    ↓
Save as Function
    ↓
Function
    ↓
Widget
    ↓
Workspace
```

This gives the platform a progression from:

```text
novel request
```

to:

```text
deterministic application functionality
```

to:

```text
reusable collaborative application surface
```

---

# Part XLVI — Widget versioning and schema evolution

# 161. Widget dependency resolution

Suppose:

```text
#overdue-customers v2
```

depends on:

```text
Metric overdue_balance v4
```

and:

```text
Customer.country
```

changes.

The dependency engine should evaluate compatibility.

---

# 162. Widget migration

A Widget version migration may update:

```text
ports
parameters
layout
data source
Function
permissions
```

---

# 163. No silent semantic change

If a Widget's displayed metric changes meaning:

```text
old metric definition
```

to:

```text
new metric definition
```

historical snapshots remain tied to their previous version.

---

# Part XLVII — Widget reference semantics

# 164. Reference types

Support:

```text
@Person
@Agent

#Widget
#Function
#Workspace
#Document
#Report
#Task
#View
```

---

# 165. Reference resolution order

For `#something`:

```text
exact user-owned object
    ↓
team object
    ↓
organization object
    ↓
tenant object
    ↓
system object
```

subject to permissions.

---

# 166. Ambiguous reference

If multiple objects match:

```text
#sales
```

show:

```text
Sales Dashboard
Sales by Country
Sales Pipeline
Sales Function
```

The AI should not arbitrarily choose among ambiguous objects.

---

# Part XLVIII — Workspace collaboration architecture

# 167. Shared Workspace object

```text
Workspace
 ├── members
 ├── roles
 ├── Widgets
 ├── references
 ├── comments
 ├── activity
 ├── tasks
 └── decisions
```

---

# 168. Widget membership

A Widget can be:

```text
private to user
shared with workspace
shared with team
shared with organization
```

---

# 169. Widget comments

Comments can follow the Widget wherever the same Widget is referenced if the user is allowed to view the comment scope.

Alternatively, references can create local discussion threads.

The system should make the scope explicit:

```text
Widget-level comment
Workspace-level comment
Instance-level comment
```

---

# Part XLIX — Collaboration model inspired by existing systems

# 170. Portable shared components

Microsoft Loop's architecture demonstrates that portable components can remain synchronized across chats, email, documents and workspaces. This validates the general interaction pattern we are aiming for, while our platform adds canonical business semantics and governed execution. citeturn137091search0turn137091search1turn137091search12

---

# 171. Anchored collaboration

Figma demonstrates the value of attaching comments to concrete locations/regions and keeping discussion associated with the original artifact. citeturn137091search3turn137091search4

Our Widget model should extend that pattern to:

```text
rows
cells
metrics
business records
workflow steps
```

---

# 172. Reusable synchronized blocks

Notion's synced blocks demonstrate a useful model in which the same content can appear in multiple places while edits remain synchronized, with explicit permission implications. citeturn137091search2

Our Widgets should support the same general reuse principle while adding:

```text
business permissions
Function dependencies
model versions
live data
provenance
```

---

# Part L — Security boundaries

# 173. Workspace security

Controls:

```text
who can access Workspace
```

---

# 174. Widget security

Controls:

```text
who can access Widget
```

---

# 175. Business security

Controls:

```text
who can access the underlying business data/action
```

The third remains authoritative.

---

# 176. Object-aware data security

A Widget referencing:

```text
Customer ACME
```

must still verify:

```text
user.can_read(Customer ACME)
```

The reference itself is not authorization.

---

# Part LI — Data privacy

# 177. Sharing Widget does not automatically share raw data

If:

```text
#payroll-summary
```

is inserted into a workspace:

```text
the Widget reference can be shared
```

but the platform must evaluate each viewer's access to the underlying data.

---

# 178. External sharing

If a Widget is shared outside the tenant:

```text
data exposure analysis
```

must occur.

For sensitive business data, default should be:

```text
no external live sharing
```

unless explicitly permitted.

---

# Part LII — Performance

# 179. Widget lazy loading

Only load active Widgets.

Inactive Widgets can remain:

```text
metadata only
```

---

# 180. Data query isolation

Each Widget should fetch:

```text
the minimum required data
```

and use projections/functions where possible.

---

# 181. AI context isolation

Each Widget AI task receives:

```text
local widget context
+
required shared context
```

not every Workspace object.

This supports the local-small-model strategy.

---

# Part LIII — Widget caching

# 182. Cache deterministic Widget results

For safe read-only data:

```text
Widget
 ↓
Function/query
 ↓
cached result
```

with explicit freshness.

---

# 183. Never cache authoritative mutations

Commands execute against the current domain state.

---

# Part LIV — Widget rendering architecture

# 184. Semantic renderer

Pipeline:

```text
Widget Definition
      ↓
Widget IR
      ↓
Renderer
      ↓
Web / Mobile / Desktop
```

---

# 185. Rendering adapters

Potential renderers:

```text
Web
Mobile
Desktop
Email
PDF
Embedded
```

The semantic Widget stays the same.

---

# Part LV — Widget composition engine

# 186. Layout system

Use a declarative layout model:

```text
grid
flex
stack
tabs
split
dock
floating
```

Avoid hardcoding each Workspace.

---

# 187. Responsive constraints

Widgets should declare:

```text
minimum width
preferred width
priority
collapse behavior
```

---

# 188. Auto-layout

The Workspace can rearrange Widgets based on:

```text
screen size
priority
user customization
Widget dependencies
```

---

# Part LVI — AI-generated Workspace architecture

# 189. User request

> "Build me a purchasing review workspace."

The AI should produce:

```text
Business capability requirements
+
Widget graph
+
Workspace layout
```

---

# 190. Example proposal

```text
Workspace:
Purchasing Review

Widgets:
#supplier-search
#open-orders
#spend-analysis
#approval-queue
#supplier-risk
#contracts

Connections:
supplier.selected
purchase_order.selected
```

User reviews.

Then publishes.

---

# 191. Workspace proposal should be diffable

Show:

```text
Added:
6 Widgets

Connections:
5

Functions:
3

Permissions:
2

New AI capability:
1

```

Then approve.

---

# Part LVII — Widget templates

# 192. Template

A Widget template defines reusable structure:

```text
Customer Review Widget
```

Instances can parameterize:

```text
customer
period
organization
view
```

---

# 193. Template inheritance

Example:

```text
Base Customer Review
       ↓
Finance Customer Review
       ↓
Collections Customer Review
```

---

# Part LVIII — Widget marketplace / ecosystem

# 194. Future marketplace

Eventually:

```text
System Widgets
Vendor Widgets
Partner Widgets
Community Widgets
Tenant Widgets
AI-generated Widgets
```

Each declares:

```text
permissions
dependencies
external services
AI requirements
```

---

# Part LIX — Widget manifest

# 195. Minimum manifest

```yaml
widget:
  id:
  version:
  name:
  description:

  dependencies:
    capabilities:
    entities:
    metrics:
    functions:
    commands:
    workflows:

  permissions:
    read:
    interact:
    execute:
    share:

  inputs:
  outputs:
  events:
  actions:

  collaboration:
  persistence:

  rendering:
  responsive:

  ai:
    required:
    skills:
```

---

# Part LX — Widget dependency and change propagation

# 196. Dependency chain

```text
Business Model
      ↓
Function
      ↓
Widget
      ↓
Workspace
```

If:

```text
Business Model changes
```

then:

```text
Function compatibility
      ↓
Widget compatibility
      ↓
Workspace compatibility
```

must be evaluated.

---

# 197. Widget dependency states

```text
VALID
RECOMPILE
REVIEW
BROKEN
DEPRECATED
```

---

# Part LXI — Workspace object graph

# 198. Graph examples

```text
Widget
  references → Function

Widget
  displays → Metric

Widget
  contains → Conversation

Widget
  consumes → Widget

Conversation
  references → Widget

Document
  embeds → Widget

Task
  created_from → Widget

Workspace
  contains → Widget

Decision
  cites → Widget
```

---

# Part LXII — AI-generated documentation

# 199. Widget documentation

Generated from the Widget definition:

```text
purpose
inputs
outputs
data dependencies
permissions
actions
events
```

No manual duplicate documentation should be necessary for basic metadata.

---

# Part LXIII — Widget audit

# 200. Widget lifecycle audit

Record:

```text
created
generated
edited
published
shared
forked
deprecated
archived
```

---

# 201. Widget execution audit

Record:

```text
widget_instance
user
tenant
Function/Query/Command
parameters
result
timestamp
Business Model version
```

---

# Part LXIV — Design anti-patterns

# 202. Anti-pattern: widget-specific database

Do not.

---

# 203. Anti-pattern: widget-specific business logic

Avoid duplicating business rules inside frontend widgets.

---

# 204. Anti-pattern: AI-generated frontend source as the normal runtime model

Do not make generated code the semantic authority.

---

# 205. Anti-pattern: copied data by default

Use live references by default.

---

# 206. Anti-pattern: last-write-wins for business transactions

Do not.

---

# 207. Anti-pattern: Workspace permissions as business permissions

Do not.

---

# 208. Anti-pattern: giant Workspace prompt

Do not send the entire Workspace to the model.

---

# Part LXV — Recommended architecture

# 209. Complete Widget Architecture

```text
                           WORKSPACE
                              │
                    ┌─────────┴─────────┐
                    │ Workspace Graph   │
                    └─────────┬─────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
            Widget A       Widget B       Widget C
               │              │              │
        ┌──────┼───────┐      │       ┌──────┼───────┐
        ▼      ▼       ▼      ▼       ▼      ▼       ▼
      Input   Data     AI   Events   Data   Chart   Actions
        │      │       │      │       │
        └──────┼───────┘      │       │
               ▼              │       │
           Widget IR         │       │
               │              │       │
               └──────────────┼───────┘
                              ▼
                      Business Gateway
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
              Function       Query       Command
                 │            │            │
                 └────────────┼────────────┘
                              ▼
                      Business Model Kernel
                              │
                              ▼
                         Data / Events
```

---

# Part LXVI — Recommended object hierarchy

# 210. Final hierarchy

```text
Platform
  ↓
Tenant
  ↓
Workspace
  ↓
Widget Instance
  ↓
Widget Definition
  ↓
Functions / Queries / Commands / Workflows
  ↓
Business Model
  ↓
Data / Events
```

This is not a strict storage hierarchy; it is a conceptual dependency hierarchy.

---

# Part LXVII — Recommended reference hierarchy

```text
@Human
@Agent
@Team

#Widget
#Function
#Workspace
#Document
#Report
#Task
#View
#Dashboard
```

---

# Part LXVIII — Recommended user experience

# 211. Workspace view

```text
┌────────────────────────────────────────────────────────────┐
│ Collections Workspace                       @3 participants │
├───────────────────────┬────────────────────────────────────┤
│                       │                                    │
│ #overdue-customers    │ #customer-risk                    │
│                       │                                    │
│ Country [Germany ▼]   │ Risk: HIGH                        │
│ Min [€10,000]         │                                    │
│                       │ #payment-timeline                 │
│ [Run]                 │                                    │
│                       │                                    │
├───────────────────────┴────────────────────────────────────┤
│ #collection-conversation                                   │
│                                                            │
│ @Sarah: Should we escalate ACME?                           │
│ @FinanceAgent: Review #customer-risk before deciding.      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Ask / #reference / @person / Run Function / Add Widget     │
└────────────────────────────────────────────────────────────┘
```

---

# Part LXIX — The "collective but independent" principle

# 212. Widgets are independent

A user can:

```text
open #customer-risk
```

by itself.

---

# 213. Widgets are collective

Inside a Workspace:

```text
#customer
#invoices
#payments
#risk
```

can behave as a coordinated system.

---

# 214. Why this is the right balance

Pure monolith:

```text
everything tightly coupled
```

is difficult to customize.

Pure fragmentation:

```text
everything independent
```

creates islands.

Widget architecture provides:

```text
logical independence
+
shared semantic foundation
+
typed connections
```

That is the target.

---

# Part LXX — Widget-driven application architecture

# 215. The platform effectively becomes a composable application system

A traditional application is:

```text
screen
 ↓
backend
 ↓
database
```

The new architecture is:

```text
Workspace
 ↓
Widget graph
 ↓
Business operations
 ↓
Canonical data model
```

---

# 216. User-built application loop

```text
New requirement
      ↓
AI
      ↓
Business IR
      ↓
Function
      ↓
Widget
      ↓
Workspace
      ↓
Team collaboration
```

This is the user-created application model.

---

# Part LXXI — Relationship to the other architecture documents

# 217. Business Model Kernel

Defines:

```text
what the business means
```

---

# 218. Business IR

Defines:

```text
what business operation is requested
```

---

# 219. Function Engine

Defines:

```text
how a reusable operation executes
```

---

# 220. Widget Runtime

Defines:

```text
how a user interacts with an operation
```

---

# 221. Workspace Runtime

Defines:

```text
how multiple interactions are organized and connected
```

---

# 222. Hermes

Defines:

```text
how AI reasons and orchestrates
```

---

# 223. Model Runtime

Defines:

```text
which inference engine/model supplies intelligence
```

---

# 224. Data Plane

Defines:

```text
where authoritative business state and derived data live
```

---

# Part LXXII — Full system

```text
                              USER
                                │
                                ▼
                         WORKSPACE RUNTIME
                                │
                         Workspace Graph
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
             Widget          Widget           Widget
                │               │                │
         ┌──────┼─────┐         │        ┌──────┼──────┐
         ▼      ▼     ▼         ▼        ▼      ▼      ▼
       Inputs  Data   AI      Events    Data   Forms  Actions
                │               │                │
                └───────────────┼────────────────┘
                                ▼
                       BUSINESS AGENT GATEWAY
                                │
                        ┌───────┼────────┐
                        ▼       ▼        ▼
                      Query   Command  Workflow
                        │       │        │
                        └───────┼────────┘
                                ▼
                        BUSINESS MODEL KERNEL
                                │
                      ┌─────────┼─────────┐
                      ▼         ▼         ▼
                    Data      Events   Projections
                      │         │         │
                      └─────────┼─────────┘
                                ▼
                          Hermes / AI
                                │
                    ┌───────────┼──────────┐
                    ▼           ▼          ▼
                  Skills      Memory     Models
```

---

# Part LXXIII — Non-negotiable widget rules

```text
1. A Widget is a first-class business interaction object.

2. A Widget is not an independent data silo.

3. Business truth remains in the canonical Business Model / Data Plane.

4. A Widget has a typed contract.

5. Inputs and outputs are semantic.

6. Widget IR describes interaction/presentation requirements, not frontend source code.

7. Widget definitions are distinct from widget instances.

8. Widgets can operate independently.

9. Widgets can compose collectively.

10. Widget-to-widget communication uses typed ports, events, references or shared context.

11. Canonical EntityRef objects should be used instead of copied business data.

12. Live linked Widgets are the default sharing mode.

13. Snapshot is an explicit alternative.

14. Function = behavior; Widget = interaction.

15. Workspace = organization of Widgets.

16. Widget permissions never replace business authorization.

17. Business mutations always go through Commands/Workflows.

18. Collaborative editing is separate from business transaction execution.

19. CRDT/OT-style mechanisms belong to collaborative document/layout state, not authoritative business transactions.

20. AI generates Widget IR / patches, not arbitrary UI code.

21. AI should receive Widget-scoped context whenever possible.

22. General chat can reference Widgets using #.

23. People/agents should be referenced using @.

24. Widget references respect underlying data permissions.

25. Widgets are versioned.

26. Widget dependencies are tracked.

27. Schema/business changes trigger Widget impact analysis.

28. Widgets can be embedded in conversations, documents, dashboards and other Workspaces.

29. Widget libraries are UX over a canonical Object Registry.

30. Widgets can be forked without duplicating business truth.

31. Widget outputs can become documents, tasks, decisions or Functions.

32. Workspace activity and business audit are distinct records.

33. Widget definitions should generate documentation where possible.

34. Widgets should support responsive and accessibility-aware rendering.

35. Widget runtime should be renderer-independent.

36. Widget graphs should be inspectable.

37. Database islands must not be reproduced as Widget islands.

38. Every Widget should have a clear owner, purpose and dependency graph.

39. Every high-risk Widget action must have explicit authorization and audit.

40. The end state is a composable collaborative business application, not a dashboard collection.
```

---

# Part LXXIV — Final architectural conclusion

The widget architecture completes an important part of the platform.

The system is no longer:

```text
Chat
+
ERP screens
+
AI
```

It becomes:

```text
                 BUSINESS OPERATING ENVIRONMENT
                              │
                         WORKSPACE
                              │
                      WIDGET OBJECT GRAPH
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Communication          Data / Analytics      Actions
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                       BUSINESS MODEL
                              │
                              ▼
                       DETERMINISTIC CORE
```

Widgets become the bridge between **business logic and human work**.

They can be:

```text
analytical
functional
data-oriented
visual
conversational
document-based
workflow-based
collaborative
```

and they can work:

```text
alone
```

or:

```text
as a coordinated graph
```

without creating isolated data.

The `@` / `#` reference system then makes these objects addressable across the platform:

```text
@Sarah review #supplier-risk

Compare #revenue with #gross-margin.

Add #overdue-customers to this workspace.

Put #quarterly-sales into the report.

Ask @FinanceAgent to analyze #cash-exposure.
```

That is more than a convenience syntax.

It creates a common object-reference layer across:

```text
conversation
workspace
widgets
documents
functions
reports
tasks
agents
```

The most important architectural statement is therefore:

> **A Widget is an independently usable, persistently addressable, typed business interaction object that can compose with other Widgets through shared semantic contracts while remaining anchored to the same canonical Business Model.**

This gives the platform the ability to move from:

```text
AI answers a request
```

to:

```text
AI builds a Function
```

to:

```text
Function becomes a Widget
```

to:

```text
Widgets become a Workspace
```

to:

```text
Workspace becomes a collaborative business application
```

without requiring the user to become a traditional programmer.

The underlying architecture remains coherent because:

```text
Widgets share Business Model
Widgets share Functions
Widgets share canonical data
Widgets share authorization
Widgets share provenance
Widgets share versions
Widgets share dependency graph
```

while their interaction surfaces remain independently composable.

That is the recommended direction for the Workspace architecture.