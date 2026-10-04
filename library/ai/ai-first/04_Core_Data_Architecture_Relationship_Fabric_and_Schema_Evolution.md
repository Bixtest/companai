# Core Data Architecture, Relationship Fabric, Schema Evolution, and Dependency Propagation
## The Structural Integrity Layer of the AI-Native Business Platform

**Design baseline:** 2026-10-03  
**Related architecture:** Hermes Agent Runtime, Business Model Kernel, Business IR, Local-First AI Runtime, User Functions, Capability Packages

---

# Executive Summary

This document defines the **core data architecture** of the platform and, critically, how it differs from the data introduced by optional business capabilities.

The central architectural requirement is:

> **The platform must have one coherent business data architecture, not a collection of independent module databases.**

Traditional business software frequently grows by adding modules:

```text
Finance
Sales
HR
Inventory
Projects
Service
...
```

and each module gradually accumulates its own tables, concepts, identifiers, relationships, reports, and duplicated data.

That creates:

```text
database islands
duplicated entities
duplicate customer records
duplicate organization records
duplicate addresses
duplicate product definitions
inconsistent terminology
inconsistent status values
manual synchronization
ambiguous ownership
broken analytics joins
AI confusion
```

The proposed platform must work differently.

The correct architecture is:

```text
                         CORE BUSINESS DATA ARCHITECTURE
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
         Identity / Org           Reference Data        Core Entities
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                            RELATIONSHIP FABRIC
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
               Finance             Sales            Inventory
              Capability          Capability          Capability
                   │                  │                  │
                   └──────────────────┼──────────────────┘
                                      │
                                 Shared Data
                                      │
                          Events / Projections / Search
```

A capability/module does not get to create a parallel version of:

```text
Customer
Company
Employee
Product
Address
Currency
Country
User
Organization
```

unless there is a genuine semantic distinction.

Instead, capabilities **reference and extend canonical core entities**.

The platform therefore has two major data categories:

## A. Core Data Architecture

The relatively stable, cross-platform foundation:

```text
Tenant
Organization
LegalEntity
BusinessUnit
Location
User
Person
Party
Role
Permission
Currency
Country
Language
Address
Document
File
ContactPoint
Product / Item
Unit
Calendar
Tax concepts
Audit identity
```

These objects are shared infrastructure for many capabilities.

## B. Capability Data

Business-specific structures added by capabilities:

```text
Invoice
SalesOrder
PurchaseOrder
WarehouseTransfer
Project
EmployeeContract
Course
Vehicle
MaintenanceRecord
```

Capability data should connect to core data and to other capability data through explicit semantic relationships.

The result is not a physically flat database. It is a **connected semantic graph implemented on a strongly typed transactional store**.

The key principle is:

> **Maximize semantic connectivity; minimize unnecessary physical coupling.**

"Everything must be connected" does **not** mean every table should have foreign keys to every other table. It means every piece of meaningful business data must have a known owner, identity, relationship path, and semantic place in the overall model.

---

# Part I — Why this deserves its own architecture

## 1. The database is not merely storage

In this platform, the data architecture controls:

```text
business meaning
AI understanding
queryability
analytics
permissions
workflow
user customization
schema evolution
function validity
MCP capability
documentation
```

Therefore:

> **The database architecture is part of the platform's reasoning architecture.**

A poor database design will eventually force the AI layer to compensate for ambiguity.

A strong data architecture removes ambiguity before the AI sees it.

---

# 2. The platform should not grow by stacking independent modules

Avoid:

```text
Core
 ├── Finance database
 ├── Sales database
 ├── HR database
 ├── Inventory database
 ├── Projects database
 └── Service database
```

as unrelated islands.

Instead:

```text
Core Business Graph
 ├── Finance capability
 ├── Sales capability
 ├── HR capability
 ├── Inventory capability
 ├── Projects capability
 └── Service capability
```

Every capability joins the same logical universe.

---

# 3. "Module" should become a capability boundary, not a data boundary

A capability can own:

```text
its specific entities
its workflows
its commands
its policies
its metrics
its UI
its skills
```

but should not automatically own separate copies of shared master data.

For example:

```text
Sales
 └── references Customer

Finance
 └── references Customer

Support
 └── references Customer

Projects
 └── references Customer
```

rather than:

```text
SalesCustomer
FinanceCustomer
SupportCustomer
ProjectCustomer
```

unless the domain definition genuinely requires separate entities.

---

# Part II — The Core Data Architecture

# 4. Core versus capability data

The platform should formally classify entities.

```text
EntityClass:
    CORE
    CAPABILITY
    PROJECTION
    REFERENCE
    EXTERNAL
    TEMPORARY
```

### CORE

Cross-capability business identity and structure.

### CAPABILITY

Owned by a business capability.

### PROJECTION

Derived read model.

### REFERENCE

Controlled shared vocabulary.

### EXTERNAL

External-system representation.

### TEMPORARY

Ephemeral processing state.

This classification should exist in the Business Model Kernel.

---

# 5. Core entity principles

A core entity should be elevated into the shared model only when it has:

```text
cross-capability significance
stable identity
clear semantic ownership
multiple consumers
```

Do not put everything in core merely because it is important to one module.

Core must remain coherent.

---

# 6. Candidate core entities

A starting candidate set:

```text
Tenant
Organization
LegalEntity
BusinessUnit
Department
Location
Person
Party
User
Agent
Role
Permission
Address
ContactPoint
Country
Currency
Language
UnitOfMeasure
Calendar
FiscalPeriod
Document
File
Tag
Product / Item
TaxCategory
AccountingPeriod
```

Not all need to be implemented immediately.

The model should evolve as actual requirements are proven.

---

# 7. Party model

One particularly important design choice is to avoid separate identity silos.

A generalized party model can support:

```text
Person
Organization
```

as parties.

Then roles can express:

```text
Customer
Supplier
Employee
Partner
Contact
Shareholder
Carrier
Agent
```

without copying the underlying person or organization record.

Example:

```text
Party
 ├── Person
 └── Organization

CustomerRole
SupplierRole
EmployeeRole
PartnerRole
```

This prevents a company from becoming:

```text
customer_company
supplier_company
partner_company
```

as three unrelated records.

---

# 8. Role-based semantics instead of duplicate identities

A single organization can legitimately be:

```text
Customer
Supplier
Partner
Distributor
```

Therefore:

```text
Party = identity
Role = business relationship
```

This is more reusable than duplicating the organization.

---

# 9. Address architecture

Avoid copying:

```text
customer.address
supplier.address
employee.address
warehouse.address
```

into unrelated structures unless domain semantics require snapshots.

Instead:

```text
Party
 └── Address[]
```

and business documents can reference a specific address.

When a document legally requires historical preservation:

```text
Invoice
 └── BillingAddressSnapshot
```

may be appropriate.

This is a crucial distinction:

> **Reference current master data; snapshot immutable historical facts when the business event requires them.**

---

# 10. Contact points

Use a common model for:

```text
email
phone
website
other communication endpoint
```

rather than building independent contact fields for every module.

---

# 11. Product / Item architecture

The platform should distinguish semantic concepts such as:

```text
Product
Item
SKU
Variant
InventoryItem
Service
Bundle
```

rather than allowing each capability to invent its own version.

For example:

```text
Product
 ├── ProductVariant
 ├── UnitOfMeasure
 ├── TaxCategory
 └── InventoryIdentity
```

Capabilities reference the appropriate canonical object.

---

# Part III — Relationship Fabric

# 12. Relationships are first-class architecture

A relationship is not merely:

```text
foreign_key
```

It is a semantic statement:

```text
Invoice belongs_to Customer
Invoice contains InvoiceLine
InvoiceLine references Product
Payment settles Invoice
Employee belongs_to Organization
Project serves Customer
Warehouse belongs_to Organization
```

Therefore the platform must maintain a **Relationship Registry**.

---

# 13. Relationship Registry

Every relationship should have:

```text
relationship_id
source_entity
target_entity
cardinality
ownership
semantic meaning
optional/required
delete behavior
visibility
authorization inheritance
allowed traversal
aggregation semantics
temporal semantics
version
```

---

# 14. Cardinality

Explicitly encode:

```text
1:1
1:N
N:1
N:N
```

Do not make the AI infer this.

---

# 15. Ownership

A relationship may indicate:

```text
owned child
reference
association
membership
historical snapshot
external reference
derived relation
```

This affects deletion, lifecycle and reasoning.

---

# 16. Relationship semantics

These are not equivalent:

```text
Invoice → Customer
```

and:

```text
Invoice → IssuingOrganization
```

Even if both happen to point at an organization-like entity.

The semantic relationship name matters.

---

# 17. Valid traversal paths

The registry should know:

```text
Customer
  → Invoice
  → InvoiceLine
  → Product
```

and:

```text
Customer
  → Project
  → ProjectCost
```

This becomes part of Business IR planning.

---

# 18. Relationship graph

Maintain a logical graph:

```text
                 Organization
                 /    |     \
                /     |      \
             User   Customer  Supplier
                      │          │
                      ▼          ▼
                    Order      Purchase
                      │          │
                      ▼          ▼
                   Invoice ← Payment
                      │
                      ▼
                   Product
                      │
                      ▼
                  Inventory
```

This is a logical relationship graph.

It need not imply a graph database.

---

# 19. Avoid artificial physical connectivity

A common error would be:

> "Everything must be connected, so add foreign keys everywhere."

That can produce:

```text
coupling
circular dependencies
hard migrations
unclear ownership
performance problems
```

The correct objective is:

> **Every meaningful business relationship should be represented semantically, while physical constraints should exist where integrity requires them.**

---

# 20. Three types of connectivity

The architecture should distinguish:

### Semantic connectivity

The business model knows that concepts are related.

### Physical connectivity

Database constraints/indexes enforce or optimize the relation.

### Analytical connectivity

The analytics layer exposes the relation efficiently for queries.

One relationship may have all three, but they are not identical.

---

# Part IV — Avoiding redundancy

# 21. Redundancy is not automatically bad

We need to be precise.

Some redundancy is useful:

```text
snapshots
materialized views
read models
cached derived values
denormalized analytics
```

The problem is **uncontrolled semantic duplication**.

---

# 22. Three categories of duplication

### Forbidden duplication

Two authoritative records represent the same fact.

Example:

```text
customer.credit_limit
finance_customer.credit_limit
```

with both independently editable.

### Controlled duplication

A derived copy exists with one authoritative source.

Example:

```text
Customer.name
       ↓
search index
```

### Required historical duplication

An event/document snapshot preserves what was true at a point in time.

Example:

```text
Invoice.billing_address_snapshot
```

The architecture must distinguish these.

---

# 23. Single ownership of facts

Every authoritative business fact should have:

```text
owner_entity
owner_field
authority
version
```

Example:

```text
Customer.primary_country
```

has one owner.

Other structures reference it or derive from it.

---

# 24. Derived data must declare its source

Example:

```text
Customer.outstanding_balance
```

should say:

```text
derived_from:
    Invoice.outstanding_amount
    Payment.allocations
```

It must be clear whether the field is:

```text
authoritative
cached
derived
materialized
```

---

# 25. Derived values should not become accidental truth

If:

```text
Customer.outstanding_balance
```

is stored for performance, the model should mark:

```text
authority = derived
source = metric_overdue_balance
refresh = transactional/event-driven
```

The AI must know that it is not an independent fact.

---

# Part V — Bounded domains without database islands

# 26. The platform still needs bounded contexts

A fully connected model does not mean every capability can directly depend on every internal table.

For example:

```text
Payroll
Accounting
Inventory
```

may have specialized internal models.

What matters is that shared concepts are exposed through explicit contracts.

---

# 27. Shared core + capability internals

Recommended:

```text
CORE
 │
 ├── Customer
 ├── Party
 ├── Organization
 └── Product
      │
      ├── Sales internal model
      ├── Finance internal model
      ├── Inventory internal model
      └── Service internal model
```

Each capability can maintain private internal complexity while exposing canonical relationships at its boundary.

---

# 28. Capability contracts

Each capability should publish:

```text
public entities
public relations
public metrics
public commands
public events
public permissions
```

Private implementation details remain internal.

This avoids both extremes:

```text
database islands
```

and:

```text
one enormous tightly coupled schema
```

---

# Part VI — Schema architecture

# 29. Logical schema versus physical schema

The system needs at least three layers:

```text
Canonical logical schema
       ↓
Compiled physical schema
       ↓
Runtime database
```

The canonical logical model is authoritative.

---

# 30. Logical schema example

```yaml
entity:
  id: ent_invoice
  name: Invoice

fields:
  - id: field_invoice_number
    type: InvoiceNumber
  - id: field_invoice_customer
    type: CustomerRef
  - id: field_invoice_currency
    type: Currency
  - id: field_invoice_total
    type: Money
```

The compiler determines physical implementation.

---

# 31. Physical representation

The compiler may produce:

```text
tables
columns
indexes
constraints
foreign keys
partitioning
materialized views
triggers
generated columns
```

The application should not have to duplicate this information manually.

---

# 32. One model, many representations

The same logical object can be projected to:

```text
PostgreSQL schema
REST/OpenAPI schema
MCP tool schema
UI schema
AI semantic object
analytics definition
documentation
```

---

# Part VII — Schema change architecture

# 33. Schema changes are model changes

When the user says:

> Add Vehicle.

the first operation is:

```text
draft Business Model change
```

not:

```text
ALTER TABLE
```

---

# 34. Change pipeline

```text
User / AI request
        ↓
Model Proposal
        ↓
Semantic Validation
        ↓
Dependency Analysis
        ↓
Impact Analysis
        ↓
Migration Planning
        ↓
Artifact Generation
        ↓
Automated Tests
        ↓
Preview
        ↓
Approval
        ↓
Migration
        ↓
Post-migration Verification
        ↓
Publish Model Version
```

---

# 35. Model diff

The platform should represent changes structurally:

```text
ADDED ENTITY
Vehicle

ADDED FIELD
Vehicle.purchase_price : Money

ADDED RELATION
Vehicle.owner → Employee

ADDED COMMAND
AssignVehicle

ADDED VIEW
VehicleList
```

This is much more useful than an SQL migration alone.

---

# 36. Dependency graph

Every model artifact should record:

```text
depends_on
used_by
```

Example:

```text
Invoice.status
   │
   ├── overdue_balance metric
   ├── collections workflow
   ├── overdue_customer function
   ├── finance dashboard
   ├── MCP invoice search
   ├── AI skill
   └── documentation
```

When `Invoice.status` changes, the dependency engine finds all affected objects.

---

# 37. Dependency classes

Track at least:

```text
structural dependency
semantic dependency
execution dependency
security dependency
UI dependency
analytics dependency
AI dependency
documentation dependency
migration dependency
```

---

# 38. Change propagation

A model change should automatically trigger:

```text
database migration analysis
API regeneration
MCP schema update
AI semantic update
skill regeneration/revalidation
Function compatibility analysis
UI regeneration
metric validation
workflow validation
permission analysis
documentation regeneration
tests
```

Only affected artifacts should be regenerated.

---

# 39. Do not regenerate everything blindly

The compiler should use dependency edges.

Example:

```text
Product.description
```

changes.

Affected:

```text
Product search
Product UI
Product AI description
```

Not necessarily:

```text
Payroll
Accounts Payable
Tax engine
```

This keeps the system efficient.

---

# Part VIII — Versioning

# 40. Semantic versioning for the model

Every published model has:

```text
model_version
```

and individual artifacts can have:

```text
entity_version
field_version
metric_version
command_version
workflow_version
policy_version
```

---

# 41. Effective dating

For business rules and metrics:

```text
effective_from
effective_to
```

may be required.

---

# 42. Historical reproducibility

A report created last year should be able to say:

```text
Business Model v1.8
Metric Revenue v2.1
Policy Sales v1.3
Function v4
```

so its interpretation can be reproduced.

---

# 43. Function compatibility

If:

```text
Function F
```

depends on:

```text
Metric M v2
```

and metric M changes:

```text
F
→ compatibility check
```

Possible result:

```text
compatible
requires recompilation
requires user review
invalid
```

---

# Part IX — Referential integrity

# 44. Database constraints remain important

Use physical constraints for:

```text
foreign keys
unique constraints
not null
check constraints
```

where appropriate.

The semantic layer complements rather than replaces them.

---

# 45. Tenant-aware foreign keys

When needed, relationships should protect against cross-tenant references.

The system must ensure:

```text
Invoice.tenant_id
=
Invoice.customer.tenant_id
```

not merely:

```text
Invoice.customer_id exists
```

---

# 46. Row-level security

Use PostgreSQL Row Level Security as defense in depth for multi-tenant access.

Application authorization remains the primary business layer.

---

# 47. Cross-tenant references should be impossible by construction

The data layer should make an invalid relation impossible or immediately rejected.

Do not depend on:

```text
"the LLM won't do that."
```

---

# Part X — Data lifecycle

# 48. Every entity should define lifecycle semantics

```text
created
active
suspended
archived
deleted
purged
```

as appropriate.

---

# 49. Deletion policy

Every entity should define:

```text
delete behavior
reference behavior
retention
purge policy
audit requirements
```

Possible behaviors:

```text
restrict
cascade
archive
soft-delete
detach
snapshot
```

---

# 50. Historical facts

If an invoice legally needs to preserve the address used at issuance:

```text
Party Address
     ↓
Invoice
     ↓
immutable snapshot
```

The snapshot is not redundant business truth; it is an historical fact.

---

# Part XI — Events and relationship maintenance

# 51. Events should describe business facts

Examples:

```text
CustomerCreated
CustomerUpdated
InvoiceIssued
PaymentRegistered
InventoryTransferred
EmployeeHired
```

Events are not the primary database model.

They complement current state.

---

# 52. Transactional outbox

When a business transaction changes state:

```text
database transaction
    ├── current state
    ├── audit
    └── outbox event
```

all commit atomically.

---

# 53. Relationship updates

Events can trigger:

```text
search update
analytics projection
workflow
notifications
agent automation
external integration
```

but should not replace authoritative state constraints.

---

# Part XII — Search architecture

# 54. Search should be a projection

The search index should derive from canonical entities.

```text
Customer
  ↓
search projection
```

not become a second customer database.

---

# 55. AI search

AI retrieval should reference:

```text
entity_id
tenant_id
document_id
model_version
source
```

so semantic results can be traced.

---

# Part XIII — AI relationship to the schema

# 56. The AI should consume semantic metadata

For each relevant entity:

```text
meaning
identity
fields
relationships
allowed operations
metrics
rules
```

The model should not inspect raw database internals unless a privileged developer capability explicitly requires it.

---

# 57. AI semantic registry

The registry should derive from the Business Model:

```text
Entity → definition
Field → description
Relationship → meaning
Metric → formula
Command → contract
Workflow → state machine
```

---

# 58. AI context should be generated from the model

When the user asks about Finance:

```text
request
 ↓
capability detection
 ↓
semantic retrieval
 ↓
relevant finance model
```

not:

```text
entire ERP schema
```

---

# Part XIV — Function relationship to the data model

# 59. Functions depend on logical objects

A deterministic Function should say:

```text
uses:
  entity Customer
  metric overdue_balance
  field country
```

rather than only:

```text
SQL text
```

---

# 60. Function invalidation

If a dependency changes:

```text
Function
  ↓
dependency graph
  ↓
impact check
```

The function may remain:

```text
valid
```

or become:

```text
needs recompile
needs review
invalid
```

---

# Part XV — Reducing database islands

# 61. Canonical identity registry

Create a shared identity registry for:

```text
Party
Product
Organization
Location
User
Document
```

This is one of the highest-value measures against islands.

---

# 62. Canonical relationship paths

The platform should define preferred paths.

For example:

```text
Order
  → Customer
```

rather than some capability-specific customer copy.

---

# 63. Canonical metrics

Do not allow:

```text
Sales Revenue
Finance Revenue
Dashboard Revenue
AI Revenue
```

to silently mean different things.

Use:

```text
metric_revenue
```

with explicit definitions and versioning.

---

# 64. Shared reference vocabularies

Standardize:

```text
Country
Currency
Language
Unit
TaxCategory
Status classes
```

where the concept is genuinely shared.

---

# Part XVI — Preventing semantic drift

# 65. Vocabulary registry

Every important concept can have:

```text
canonical name
aliases
localized names
deprecated names
external names
```

Example:

```text
Canonical:
Customer

Aliases:
Client
Account
Buyer
Customer Account
```

The AI resolves these to the same canonical concept only where the business model explicitly permits it.

---

# 66. Prohibit local synonyms from becoming new entities automatically

If a user says:

> "Clients"

the system should not create:

```text
Client
```

as a new entity when:

```text
Customer
```

already exists.

The semantic registry resolves first.

---

# Part XVII — Data governance for user customization

# 67. Users must not create duplicate master entities casually

If a user attempts:

> Add Company Management.

and the platform already has:

```text
Organization
LegalEntity
Party
```

the builder should explain:

```text
Existing compatible concepts:
Organization
LegalEntity
Party
```

and ask the model/configuration layer to extend them rather than creating:

```text
Company2
```

---

# 68. Entity creation guard

Before creating a new entity:

```text
semantic similarity check
+
identity registry check
+
relationship analysis
+
existing capability search
```

The platform should flag:

```text
possible duplicate entity
```

before publication.

---

# 69. Field creation guard

Before adding:

```text
Customer.company_name
```

the builder should check:

```text
Customer.party.name
Organization.name
```

and explain the existing canonical field.

---

# 70. Relationship creation guard

Before creating:

```text
Invoice.supplier_id
```

the platform should determine whether:

```text
Invoice
  → Party
  → SupplierRole
```

already expresses the relationship.

---

# Part XVIII — Core/capability architecture in practice

# 71. Example: Sales

Sales may own:

```text
Lead
Opportunity
Quote
SalesOrder
SalesOrderLine
```

but reference:

```text
Customer
Party
Product
Address
Currency
TaxCategory
Organization
User
```

---

# 72. Finance

Finance may own:

```text
Invoice
Payment
Receivable
Payable
AccountingEntry
```

but reference the same:

```text
Customer
Supplier/Party
Product
Currency
Organization
TaxCategory
```

---

# 73. Inventory

Inventory may own:

```text
WarehouseStock
InventoryMovement
Transfer
Reservation
```

but reference:

```text
Product
Organization
Location
Order
```

---

# 74. HR

HR may own:

```text
Employment
Compensation
Leave
TimeEntry
```

but reference:

```text
Person
User
Organization
Location
Calendar
Currency
```

---

# 75. CRM / Support

Support may own:

```text
Ticket
Case
Interaction
SLA
```

but reference:

```text
Customer
Person
Organization
Product
Order
Invoice
```

This is what a connected ERP ecosystem looks like.

---

# Part XIX — Relationship-aware analytics

# 76. Analytics should consume semantic paths

A question:

> Revenue by customer and product.

The system should know:

```text
Revenue
    source metric

Customer
    dimension

Product
    dimension

approved path:
Customer → Order → OrderLine → Product
```

The planner should not invent the relationship.

---

# 77. Avoid fan-out errors

A major cause of ERP analytics errors is joining multiple one-to-many relationships:

```text
Invoice
 ├── Lines
 └── Payments
```

If joined naively:

```text
3 lines × 4 payments
=
12 rows
```

and totals become inflated.

The semantic/metric engine should understand cardinality and aggregation strategy.

This is one of the most important practical benefits of an explicit relationship registry.

---

# 78. Metric grain and relationship grain

Every metric should explicitly declare:

```text
base grain
aggregation grain
relationship path
```

This allows the compiler to produce safe query plans.

---

# Part XX — Schema compiler and dependency engine

# 79. The Schema Compiler

The compiler takes:

```text
Business Model
```

and produces:

```text
physical schema
API
UI
AI metadata
MCP
documentation
tests
```

---

# 80. Dependency Engine

The Dependency Engine maintains a directed graph:

```text
Artifact A
    ↓
depends_on
    ↓
Artifact B
```

Graph edges are versioned.

---

# 81. Change engine

When:

```text
Artifact X
```

changes:

```text
find downstream dependents
        ↓
classify impact
        ↓
regenerate affected artifacts
        ↓
run tests
        ↓
publish
```

---

# 82. Impact classes

```text
INFO
SAFE
REQUIRES_RECOMPILE
REQUIRES_REVIEW
BREAKING
BLOCKED
```

---

# 83. Example

Change:

```text
Customer.name
→
Customer.display_name
```

Impact:

```text
Database migration                 SAFE
API schema                          REGENERATE
UI forms                            REGENERATE
AI semantic registry                REGENERATE
Search index                        REBUILD
Functions referencing name         RECOMPILE
Skills mentioning name             REVIEW
External integrations               REVIEW
Historical data                     MIGRATION
```

---

# Part XXI — Database migration strategy

# 84. Expand → migrate → contract

For risky changes:

```text
expand
 ↓
backfill
 ↓
switch readers
 ↓
switch writers
 ↓
validate
 ↓
contract
```

Avoid destructive migrations in one step.

---

# 85. Example field rename

Instead of:

```text
rename immediately
```

use:

```text
new field
 ↓
dual-write temporarily
 ↓
backfill
 ↓
read from new
 ↓
verify
 ↓
remove old
```

The compiler should generate this where safe.

---

# 86. Migration checkpoints

Record:

```text
migration_id
model_version_before
model_version_after
started_at
completed_at
operator
result
verification
rollback/recovery information
```

---

# Part XXII — Data integrity monitoring

# 87. Structural health checks

Continuously check:

```text
orphaned records
broken references
duplicate identities
invalid enum values
cross-tenant references
unexpected nulls
constraint violations
schema drift
stale projections
```

---

# 88. Semantic health checks

Also detect:

```text
multiple authoritative owners for same concept
duplicate metrics
duplicate fields
conflicting relationship definitions
unreachable entities
isolated entities
unused entities
```

---

# 89. Database island detector

The platform should periodically identify:

```text
entity with no meaningful relationships
capability with duplicated master data
parallel identity systems
isolated reporting tables
manual synchronization dependencies
```

and report:

```text
Potential data island detected.
```

---

# Part XXIII — Data lineage

# 90. Every derived artifact should have lineage

For:

```text
metric
projection
report
function
search index
AI answer
```

record:

```text
source entities
source fields
source metrics
transformation
model version
```

---

# 91. AI answer lineage

A user asks:

> Why did gross margin fall?

The result can trace:

```text
Gross Margin metric
 ↓
Revenue metric
Cost metric
 ↓
Order / Invoice / Inventory data
 ↓
specific records / periods
```

The AI explains from the deterministic lineage.

---

# Part XXIV — Data freshness

# 92. Freshness should be explicit

For every projection/metric:

```text
real-time
transactional
eventual
hourly
daily
```

The result should say:

```text
Data current as of 2026-10-03 20:15
```

where applicable.

---

# 93. AI should not pretend stale data is current

If a metric is:

```text
analytics snapshot
```

the AI must receive that metadata.

---

# Part XXV — External systems and integration

# 94. External data is not automatically core truth

Example:

```text
SalesforceCustomer
```

should not immediately become:

```text
Customer
```

without governance.

Instead:

```text
ExternalCustomer
    ↓
identity mapping
    ↓
canonical Party/Customer
```

---

# 95. External identifiers

Maintain:

```text
ExternalIdentity
```

such as:

```text
system = stripe
object = customer
external_id = cus_123
```

mapped to:

```text
party_id
```

This prevents duplicate master data.

---

# 96. Integration ownership

For every external field:

```text
source
authority
sync direction
conflict resolution
last synchronized
```

must be known.

---

# Part XXVI — Documents

# 97. Documents should reference canonical entities

Instead of:

```text
document.customer_name = "ACME"
```

alone, use:

```text
document
  → party/customer
```

while retaining extracted textual values as evidence.

---

# 98. Document facts versus canonical data

A contract may say:

```text
"Payment terms: 60 days"
```

The document is evidence.

The canonical supplier/payment-term field becomes business state only through an approved business process.

---

# Part XXVII — AI-safe database semantics

# 99. AI sees business graph, not physical graph

The AI-facing representation should resemble:

```text
Customer
  ├── Orders
  ├── Invoices
  ├── Payments
  ├── Projects
  └── Tickets
```

not:

```text
crm_customer
ar_invoice
payment_header
payment_alloc
ticket_tbl
```

---

# 100. Semantic handles

Every object should have:

```text
canonical id
human name
aliases
description
relationship definitions
allowed actions
```

---

# 101. AI cannot invent relationship edges

A Business IR traversal must be validated against:

```text
Relationship Registry
```

---

# Part XXVIII — User-created schema extensions

# 102. New field

User asks:

> Add customer risk rating.

Builder determines:

```text
Customer
  risk_rating : RiskRating
```

rather than creating:

```text
CustomerRisk
```

unless the business semantics actually require a separate entity.

---

# 103. New relationship

User asks:

> Link customers to account managers.

Builder creates:

```text
Customer
  assigned_account_manager → User
```

or a relationship entity if:

```text
multiple assignments
history
effective dating
territories
```

make a simple reference insufficient.

---

# 104. Use relationship entities where semantics require them

Example:

```text
CustomerAccountManagerAssignment
```

may be necessary when the relationship contains:

```text
start_date
end_date
role
percentage
territory
```

A foreign key alone cannot represent rich relationship semantics.

---

# Part XXIX — Data architecture and AI Functions

# 105. A deterministic Function can depend on any stable semantic object

For example:

```text
Function:
Customers with overdue invoices
```

depends on:

```text
Customer
Invoice
Metric: overdue_balance
Relationship: Customer → Invoice
```

---

# 106. Function execution after schema evolution

If the metric changes implementation:

```text
Function
  remains logically valid
  ↓
recompile
  ↓
new physical query
```

This is one of the strongest arguments for Business IR.

---

# Part XXX — Database versus document / graph / event / relational choices

# 107. Relational database remains the default transaction substrate

Use the relational database for:

```text
authoritative current state
constraints
transactions
authorization defense
core relationships
```

---

# 108. Graph representation is a projection

A relationship graph may be extremely useful for:

```text
semantic traversal
dependency analysis
impact analysis
AI exploration
```

but does not automatically need to be the transaction database.

---

# 109. Event store is complementary

Events provide:

```text
history
integration
workflow triggers
audit context
```

but current state remains separately queryable.

---

# 110. Documents / vectors are projections

Search and embedding systems should point back to canonical identifiers.

---

# Part XXXI — The unified data architecture

# 111. Complete model

```text
                        BUSINESS MODEL KERNEL
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
   Core Entities            Capability Entities       Reference Data
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                         RELATIONSHIP REGISTRY
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
           BUSINESS IR         METRICS            COMMANDS
               │                  │                  │
               └──────────────────┼──────────────────┘
                                  ▼
                             DATA COMPILER
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
    PostgreSQL                 Events                    Analytics
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                         PROJECTIONS / SEARCH
                                  │
                                  ▼
                             HERMES / AI
```

---

# Part XXXII — Core versus capability database layout

# 112. Recommended logical organization

```text
/core
    identity
    tenant
    organization
    party
    address
    localization
    currency
    units
    documents
    audit
    permissions

/capabilities
    finance
    sales
    inventory
    procurement
    hr
    projects
    service
    etc.

/projections
    analytics
    search
    AI read models
```

This is a logical organization.

Physical schemas can be optimized independently.

---

# Part XXXIII — What "connected as possible" should mean

# 113. Correct definition

The platform should maximize:

```text
semantic reuse
canonical identity reuse
relationship clarity
shared vocabulary
cross-capability discoverability
lineage
```

It should minimize:

```text
duplicate facts
duplicate identities
duplicate vocabulary
manual synchronization
isolated reporting models
implicit relationships
```

It should NOT maximize:

```text
number of foreign keys
number of cross-module dependencies
physical joins
```

This distinction is critical.

---

# Part XXXIV — Data architecture scorecard

# 114. Every new entity should pass these questions

```text
1. Does this concept already exist?
2. If yes, should it extend an existing entity?
3. Who owns the identity?
4. What existing entities does it relate to?
5. What is its grain?
6. What is its lifecycle?
7. What facts does it own?
8. What facts are derived?
9. What existing metrics depend on it?
10. What new relationships does it create?
11. Does it create redundancy?
12. Does it create a database island?
13. Is it genuinely core or capability-specific?
14. What permissions apply?
15. What events does it produce?
16. What functions/skills/tools depend on it?
17. How will it evolve?
```

---

# Part XXXV — New field checklist

# 115. Every new field should pass:

```text
Does the fact already exist?
Who owns it?
What type?
What unit?
What currency?
What time semantics?
What sensitivity?
What default?
What validation?
Is it authoritative or derived?
Is it required?
Does it belong on this entity?
Would a value object be better?
Does this field introduce semantic duplication?
```

---

# Part XXXVI — New relationship checklist

# 116. Every new relationship should define:

```text
source
target
cardinality
ownership
business meaning
lifecycle
temporal behavior
security propagation
delete behavior
allowed traversal
```

---

# Part XXXVII — Schema change checklist

# 117. Every change must identify:

```text
model version
affected entities
affected fields
affected relationships
affected metrics
affected commands
affected workflows
affected policies
affected Functions
affected Skills
affected MCP tools
affected UI
affected analytics
migration strategy
rollback/recovery
tests
```

---

# Part XXXVIII — Dependency graph as a first-class database

# 118. The platform should maintain an internal dependency registry

Example:

```text
Dependency
    dependent_type
    dependent_id
    dependency_type
    dependency_id
    version
    strength
```

Examples:

```text
Function F
    depends_on
Metric M

Metric M
    depends_on
Entity Invoice

Skill S
    references
Command C

MCP Tool T
    exposes
Command C
```

---

# 119. Strong and weak dependencies

### Strong

Breaking the dependency invalidates the artifact.

### Weak

The artifact may continue to work but should be revalidated.

Examples:

```text
command input field → strong
description text → weak
display label → weak
```

---

# Part XXXIX — Automatic documentation architecture

# 120. Documentation is another projection

From the canonical model:

```text
Entity definition
   ↓
human documentation
AI documentation
API documentation
MCP description
UI help text
```

---

# 121. Documentation should include provenance

Generated documentation should state:

```text
generated_from
model version
last regenerated
```

---

# Part XL — Automatic AI architecture synchronization

# 122. AI artifact generation

When the Business Model changes:

```text
Entity
  ↓
AI definition
  ↓
semantic retrieval record
  ↓
MCP/tool schema
  ↓
Skill references
  ↓
Business IR schema
```

---

# 123. Skills need semantic dependency metadata

Each Skill should declare:

```text
uses_entities
uses_metrics
uses_commands
uses_workflows
uses_policies
business_model_version
```

---

# 124. AI artifacts must be revalidated, not blindly regenerated

A model change should trigger:

```text
regenerate candidate
↓
compare
↓
test
↓
publish
```

rather than silently replacing everything.

---

# Part XLI — Automatic UI synchronization

# 125. UI is a projection

The UI can derive:

```text
form fields
table columns
filters
actions
relations
workflow controls
```

from:

```text
Entity
Field
Relationship
Command
Workflow
Permission
View
```

---

# 126. UI customizations should be layered

Use:

```text
system defaults
↓
capability defaults
↓
organization customization
↓
team customization
↓
user personalization
```

Do not fork the generated UI.

---

# Part XLII — Preventing schema decay

# 127. Schema linting

Implement automated rules such as:

```text
duplicate semantic object
unreferenced field
missing relationship
ambiguous metric
missing owner
missing tenant scope
missing audit policy
orphan entity
untyped money
untyped quantity
unsafe delete cascade
```

---

# 128. Data linting

Run:

```text
duplicate identity detection
orphan detection
invalid references
stale derived values
projection mismatch
event lag
```

---

# 129. Semantic linting

Run:

```text
duplicate metric names
conflicting definitions
same concept different IDs
same ID different semantics
ambiguous aliases
inconsistent units
conflicting relationship cardinality
```

---

# Part XLIII — Safe automatic evolution

# 130. Safe changes

Can often auto-publish after testing:

```text
new optional field
new read-only view
new alias
new non-breaking metric dimension
new UI view
```

---

# 131. Review-required changes

```text
new relationship
metric formula change
permission change
workflow change
command behavior change
field type change
```

---

# 132. Explicit-approval changes

```text
deleting data
removing field
breaking relationship
changing financial metric semantics
changing authorization boundaries
changing payroll/accounting behavior
```

---

# Part XLIV — The model builder

# 133. The ERP model builder should expose structure

UI:

```text
Business Model
 ├── Entities
 ├── Relationships
 ├── Fields
 ├── Metrics
 ├── Rules
 ├── Commands
 ├── Workflows
 ├── Policies
 ├── Views
 └── Dependencies
```

---

# 134. Relationship visualizer

A graphical interface should show:

```text
Customer
   │
   ├── Orders
   │    └── OrderLines
   │         └── Product
   │
   ├── Invoices
   │    └── Payments
   │
   └── Projects
```

This lets advanced users understand whether they are creating coherent architecture.

---

# 135. Island warning

When a user creates an entity with no meaningful connections:

```text
WARNING

This entity has no relationships to the existing business model.

Potential database island.
Suggested relationships:
...
```

This should be advisory rather than an automatic blocker, because some entities legitimately stand alone.

---

# Part XLV — AI-assisted model builder

# 136. AI should propose, not secretly modify

User:

> Add vehicle management.

AI proposes:

```text
Vehicle
VehicleType
Assignment
Maintenance
```

The builder resolves existing objects:

```text
Employee
Organization
Location
Currency
Document
```

and connects them.

---

# 137. Duplicate prevention

Before proposing:

```text
VehicleOwner
```

AI/model engine should identify:

```text
Employee
User
Party
```

and ask whether the existing concept should be referenced.

---

# Part XLVI — The "database constitution"

# 138. The platform should have structural invariants

Treat these almost like a constitution.

```text
1. One canonical owner for each authoritative fact.

2. No duplicate master identity without explicit semantic justification.

3. Every meaningful cross-capability relationship is represented.

4. Every entity has an explicit semantic owner.

5. Every entity has a defined grain.

6. Every field has a type.

7. Money and quantity include their units/currency.

8. Every metric has a definition and grain.

9. Every command has explicit preconditions and authorization.

10. Every capability declares its public contracts.

11. Physical schema is derived from the logical model.

12. Direct production DDL outside the model compiler is considered schema drift.

13. Model changes are versioned.

14. Dependencies are tracked.

15. Breaking changes require review.

16. Derived data declares its source.

17. Historical snapshots are explicitly classified.

18. Search/analytics/vector stores are projections, not independent truth.

19. Tenant ownership is explicit.

20. Cross-tenant references are prevented below the AI layer.

21. AI artifacts reference canonical IDs, not loose strings.

22. User Functions reference Business IR and dependencies, not only compiled SQL.

23. Skills are procedural projections, not authoritative policy.

24. Documentation is generated or synchronized from the canonical model.

25. Every schema change triggers dependency analysis.
```

---

# Part XLVII — Full change-propagation architecture

# 139. End-to-end

```text
                       MODEL CHANGE
                            │
                            ▼
                   ┌─────────────────┐
                   │ Change Proposal │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Semantic Check  │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Duplicate Check │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Dependency Scan │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Impact Analysis │
                   └────────┬────────┘
                            │
          ┌─────────────────┼─────────────────────┐
          ▼                 ▼                     ▼
       Database            AI                    App
       migration        artifacts             artifacts
          │                 │                     │
          ▼                 ▼                     ▼
       API/MCP          Skills/IR               UI
          │                 │                     │
          └─────────────────┼─────────────────────┘
                            ▼
                    Automated Testing
                            │
                            ▼
                       Human Review
                            │
                            ▼
                         Publish
                            │
                            ▼
                      Model Version
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         Database        Runtime        Knowledge
          updated        updated         updated
```

---

# Part XLVIII — The ideal relationship to Hermes

# 140. Hermes consumes a projection

Hermes should not have to know the entire internal database architecture.

It receives:

```text
relevant business concepts
relevant relationships
relevant metrics
relevant commands
relevant skills
relevant policies
```

all generated from the canonical model.

---

# 141. Hermes skills should update when dependencies change

Example:

```text
Capability:
Accounts Receivable v4
```

changes.

Affected:

```text
AR Skill
AR Function
AR MCP tools
AR semantic registry
AR reports
```

The system automatically revalidates these.

---

# 142. Existing sessions need version awareness

A Hermes session initiated under:

```text
Business Model v2.3
```

should not unknowingly execute against changed semantics in:

```text
Business Model v3.0
```

The Business Agent Gateway resolves the correct compatible version.

---

# Part XLIX — Database change and AI change are one governed process

# 143. The correct mental model

Do not think:

```text
Database change
+
then manually update AI
```

Think:

```text
Business Model change
        ↓
one dependency-aware build
        ↓
database
AI
API
UI
workflows
documentation
```

This is one of the central architectural differentiators.

---

# Part L — Example end-to-end change

# 144. Add vehicle maintenance tracking

User:

> We need to track vehicle maintenance.

The AI/model builder identifies existing:

```text
Vehicle
Organization
Employee
Location
Supplier
Document
Currency
```

and proposes:

```text
MaintenanceRecord
MaintenanceType
MaintenanceSchedule
MaintenanceCost
```

Relationships:

```text
Vehicle
 ├── maintenance_records
 ├── assigned_employee
 ├── location
 └── costs

MaintenanceRecord
 ├── supplier
 ├── document
 └── cost
```

The platform checks:

```text
no duplicate Vehicle entity
existing Supplier is reused
existing Currency is reused
existing Employee is reused
```

Then generates:

```text
database schema
UI
MCP tools
AI semantic objects
skills
permissions
metrics
functions
documentation
tests
```

---

# 145. Later change: maintenance cost model changes

Suppose:

```text
MaintenanceCost
```

becomes:

```text
MaintenanceTransaction
```

The dependency engine finds:

```text
cost metrics
reports
functions
AI skills
search
analytics
permissions
```

and creates a controlled migration plan.

No hidden manual synchronization should be necessary.

---

# Part LI — Data architecture and performance

# 146. Connected does not mean slow

Strong relationships do not automatically require expensive joins.

The compiler can generate:

```text
indexes
materialized views
projections
caches
analytic read models
```

while preserving canonical semantics.

---

# 147. Relationship-aware indexing

Frequently traversed relationships should have appropriate indexes.

Example:

```text
Invoice.customer_id
Payment.invoice_id
Order.customer_id
OrderLine.product_id
```

The compiler can derive many index requirements from relationship metadata.

---

# 148. Read models

For common operations:

```text
Customer360
InventoryAvailability
OrderSummary
AccountsReceivableSnapshot
```

create optimized projections.

Their source lineage remains known.

---

# 149. No semantic duplication

A projection can be physically duplicated:

```text
Customer360
```

but it should not become a second authoritative customer model.

---

# Part LII — Database architecture and local AI

# 150. Good data architecture reduces AI resource needs

The more coherent the relationship model:

```text
Customer
→ Invoice
→ Payment
```

the smaller the semantic context needed.

This directly supports:

```text
small local models
less context
less KV cache
lower latency
```

---

# 151. Precomputed semantic paths

The platform can retrieve:

```text
Customer → Invoice → Payment
```

as a known path.

The model does not need to reason about SQL joins.

---

# Part LIII — Governance of external schema changes

# 152. External integrations can cause drift too

When an external system changes:

```text
Stripe customer field
Salesforce account
bank transaction format
```

the integration layer should map the change into the canonical model.

Never let external schemas become the canonical business architecture.

---

# 153. External mapping registry

Store:

```text
external_system
external_object
external_field
canonical_entity
canonical_field
mapping version
sync direction
authority
```

---

# Part LIV — Core data migration strategy

# 154. Core migrations require the highest governance

Because many capabilities depend on:

```text
Party
Organization
Product
Currency
User
```

changes to core entities have a large impact surface.

The dependency engine should display:

```text
CORE ENTITY CHANGE

Affected:
12 capabilities
43 metrics
28 Functions
17 Skills
11 workflows
31 UI views
```

before publication.

---

# Part LV — Capability data migration strategy

# 155. Capability-only changes can be more localized

If:

```text
VehicleMaintenance
```

changes:

```text
Vehicle capability
```

may be affected without touching:

```text
Finance
Sales
HR
```

unless dependency analysis identifies actual relationships.

---

# Part LVI — Architectural decision summary

# 156. Data source of truth

```text
Business Model Kernel
```

not:

```text
raw PostgreSQL schema
```

---

# 157. Transaction source of truth

```text
PostgreSQL current state
+
business events
```

---

# 158. AI source of truth

```text
derived semantic registry
```

from the Business Model Kernel.

---

# 159. Documentation source of truth

```text
canonical model + governed knowledge
```

not independent copies.

---

# 160. Function source of truth

```text
validated Business IR
+
dependency/version metadata
```

---

# 161. Search source of truth

```text
canonical records
```

with search indices as projections.

---

# 162. Analytics source of truth

```text
canonical metrics
+
derived read models
```

---

# Part LVII — Recommended internal services

# 163. Core services

The platform should eventually separate:

```text
Model Registry
Schema Compiler
Dependency Engine
Migration Engine
Business Engine
Authorization Engine
Function Engine
Workflow Engine
Event Bus/Outbox
Knowledge Service
Search Service
Analytics Service
Audit/Provenance Service
```

These are logical services. They need not all be physically separate at first.

---

# 164. Model Registry

Responsible for:

```text
entities
fields
relations
metrics
commands
workflows
policies
versions
```

---

# 165. Schema Compiler

Responsible for:

```text
database artifacts
API schemas
MCP schemas
UI schemas
validation artifacts
```

---

# 166. Dependency Engine

Responsible for:

```text
impact graph
change propagation
compatibility
invalidation
```

---

# 167. Migration Engine

Responsible for:

```text
migration generation
execution
verification
backfill
recovery
```

---

# Part LVIII — The architecture's deepest rule

# 168. Business model first

The system must always prefer:

```text
semantic decision
→ logical model
→ physical implementation
```

over:

```text
physical database
→ infer semantics
```

---

# 169. Relationships before convenience

When introducing a capability, the first design questions should be:

```text
What existing entities does this use?
What existing identity does this reference?
What existing vocabulary does this use?
What existing metrics depend on it?
What relationships does it add?
```

Only then:

```text
What tables do we need?
```

---

# 170. Reuse before creation

Before creating:

```text
entity
field
enum
metric
relationship
```

the platform should search the existing Business Model.

The default behavior is:

```text
reuse
extend
specialize
```

before:

```text
create new
```

---

# 171. One business fact, one authority

This is the core anti-redundancy rule.

If two systems contain:

```text
Customer.credit_limit
```

then one must be authoritative and the other derived/synchronized.

Never allow ambiguity.

---

# Part LIX — Final target architecture

```text
                          PLATFORM USER
                                │
                                ▼
                         ERP FRONTEND
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
             Normal UI      AI Workspace     Model Builder
                │               │                │
                └───────────────┼────────────────┘
                                ▼
                      CANONICAL BUSINESS MODEL
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
      CORE                 CAPABILITIES              REFERENCE
      DATA                    │                       DATA
        │                     │
        └─────────────────────┼────────────────────────┐
                              ▼                        │
                     RELATIONSHIP FABRIC              │
                              │                        │
             ┌────────────────┼───────────────┐       │
             ▼                ▼               ▼       │
          Metrics          Commands        Workflows  │
             │                │               │       │
             └────────────────┼───────────────┘       │
                              ▼                        │
                       DEPENDENCY GRAPH                │
                              │                        │
                    ┌─────────┼──────────┐             │
                    ▼         ▼          ▼             │
                Database      AI         UI/API        │
                Compiler   Artifacts    Artifacts      │
                    │         │          │             │
                    ▼         ▼          ▼             │
                PostgreSQL  Hermes/MCP  Frontend       │
                    │                                  │
                    └──────────────┬───────────────────┘
                                   ▼
                         EVENTS / PROJECTIONS
                                   │
                    ┌──────────────┼─────────────┐
                    ▼              ▼             ▼
                 Search        Analytics      Knowledge
                    │              │             │
                    └──────────────┼─────────────┘
                                   ▼
                               AI RUNTIME
                                Hermes
                                   │
                          Local / Cloud Models
```

---

# Part LX — Final non-negotiable rules

```text
1. The Business Model Kernel is the canonical logical data architecture.

2. The physical database is a compiled implementation of that model.

3. Modules are capability boundaries, not independent databases.

4. Core entities provide shared identities and reusable business concepts.

5. Capability entities must reference core entities wherever semantics permit.

6. No duplicate authoritative master data without explicit semantic justification.

7. Relationships are first-class metadata.

8. Maximize semantic connectivity; do not maximize foreign-key density.

9. Every entity has an owner, identity, grain, lifecycle and tenant scope.

10. Every field has a type and semantic definition.

11. Money includes currency.

12. Quantity includes unit.

13. Metrics define grain, formula, relationships and time semantics.

14. Derived data declares its authoritative source.

15. Snapshots are explicitly classified as historical facts.

16. Search and analytics stores are projections, not independent business truth.

17. External system schemas are mapped into the canonical model; they do not define it.

18. Every new entity is checked for semantic duplication before creation.

19. Every new field is checked for existing equivalent facts before creation.

20. Every new relationship is checked against the existing relationship registry.

21. Every schema change starts as a Business Model change.

22. Production DDL outside the compiler is schema drift.

23. Every model change is versioned.

24. Every artifact has dependency metadata.

25. Schema changes automatically trigger dependency and impact analysis.

26. Only affected downstream artifacts are regenerated/revalidated.

27. Breaking changes require explicit review.

28. Core entity changes require expanded impact analysis.

29. Migrations must support safe rollout strategies.

30. Tenant boundaries are enforced below the AI layer.

31. AI receives semantic projections, not raw database structure by default.

32. AI artifacts reference canonical IDs and versions.

33. User Functions store logical Business IR and dependencies, not only SQL.

34. Skills are procedural projections, not authoritative business truth.

35. Documentation is generated/synchronized from the canonical model.

36. Data health and semantic health are continuously linted.

37. Database islands are detected automatically.

38. Cross-capability relationships are explicit.

39. The platform should preserve bounded contexts while maintaining shared canonical identity.

40. Reuse is preferred over creating new concepts.

41. Physical denormalization is allowed when the source of truth and lineage remain explicit.

42. Every important derived representation must be traceable to source data.

43. Model evolution and AI evolution are one governed change-propagation process.

44. The system should be able to reconstruct why any business result was produced.

45. The ultimate architecture is a coherent business data graph with deterministic storage and generated projections—not a pile of modules.
```

---

# Part LXI — Final conceptual conclusion

The most important correction to the phrase:

> "all data need to be as connected as possible"

is:

> **All business data should be as semantically connected and reusable as the business itself requires, while remaining properly bounded where independent ownership is necessary.**

The goal is not a giant tangled database.

The goal is a **coherent business graph**.

```text
                    ONE BUSINESS UNIVERSE
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
             CORE         CAPABILITIES      REFERENCE
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                       RELATIONSHIP FABRIC
                              │
                              ▼
                     SINGLE SEMANTIC MODEL
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
          DATABASE           AI              APP
```

The database is therefore not simply where information happens to be stored.

It is a **typed, relational expression of the business model**.

The AI does not have to reconstruct that model.

The UI does not have to duplicate it.

The API does not have to redefine it.

The documentation does not have to manually restate it.

The Functions do not have to save an implementation-specific query as their only definition.

They all derive from the same model.

And when that model changes:

```text
Business Model Change
        ↓
Dependency Graph
        ↓
Impact Analysis
        ↓
Database Migration
        +
AI Semantic Update
        +
Business IR Validation
        +
Function Compatibility
        +
Skill Revalidation
        +
MCP/API Update
        +
UI Update
        +
Documentation Update
        +
Analytics Update
        +
Tests
        ↓
New coherent platform version
```

That is the data architecture required if the platform is expected to grow indefinitely without degrading into the same collection of disconnected database islands that traditional modular enterprise systems often accumulate.

---

# Appendix A — Minimal canonical object relationships

```text
Tenant
 ├── Organization[]
 ├── User[]
 ├── Agent[]
 ├── Module[]
 ├── Entity[]
 └── Policy[]

Organization
 ├── Party
 ├── Location[]
 ├── User[]
 └── BusinessUnit[]

Party
 ├── Person | Organization
 ├── Address[]
 ├── ContactPoint[]
 └── BusinessRole[]

Entity
 ├── Field[]
 ├── Relationship[]
 ├── Metric[]
 ├── Rule[]
 ├── Constraint[]
 ├── Command[]
 ├── Workflow[]
 └── View[]

Metric
 ├── source entities
 ├── source fields
 ├── relationships
 └── Business IR definition

Command
 ├── input schema
 ├── preconditions
 ├── authorization
 ├── effects
 └── audit

Function
 ├── Business IR
 ├── dependencies
 ├── parameters
 ├── permissions
 ├── version
 └── presentation

Skill
 ├── procedures
 ├── referenced entities
 ├── referenced commands
 └── Business Model version
```

---

# Appendix B — Model-change example

```text
CHANGE:
Add Customer.RiskTier

MODEL:
Customer
    + field risk_tier : RiskTier

DEPENDENCIES DISCOVERED:
    customer_list_view
    customer_360_projection
    sales_risk_metric
    finance_risk_report
    risk-analysis skill
    customer-risk Function

COMPILER OUTPUT:
    DB migration
    API field
    UI field
    AI semantic metadata
    MCP customer schema
    documentation update

TESTS:
    authorization
    tenant isolation
    type validation
    Function regression
    metric regression

PUBLISH:
    Business Model v4.7
```

---

# Appendix C — Database island example

## Bad

```text
SalesCustomer
FinanceCustomer
SupportCustomer

SalesCompany
FinanceCompany

SalesAddress
FinanceAddress
```

## Corrected

```text
Party
 ├── Organization
 └── Person

CustomerRole
SupplierRole
EmployeeRole

Address[]
ContactPoint[]

SalesOrder
FinanceInvoice
SupportTicket

all referencing canonical Party/Organization/etc.
```

---

# Appendix D — Redundancy decision framework

When a new field/object is proposed:

```text
Does the fact already exist?
        │
       YES
        │
   ┌────┴────────────────────┐
   ▼                         ▼
Same meaning             Different meaning
   │                         │
reuse/extend              new entity may be valid
```

If a copy is needed:

```text
authoritative?
    │
   NO
    │
derived/snapshot/projection
    │
declare lineage
```

Never allow two independent authoritative owners by accident.

---

# Appendix E — Core architecture statement

> **The platform is built around a canonical, versioned business data graph. Core data defines shared identity and foundational semantics. Capabilities extend that graph without creating duplicate master-data universes. Relationships are first-class and explicitly governed. Physical storage, APIs, UI, AI semantics, MCP tools, Functions, Skills, analytics and documentation are generated or synchronized from the same canonical model. Every model change propagates through a dependency graph into migration, execution, AI and application artifacts before publication.**