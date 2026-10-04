# AI-First ERP: Research & Architecture Analysis

**Status:** Working research summary  
**Scope:** Analysis completed so far on an AI-first ERP whose primary interface is a natural-language workspace connected to the ERP database through an AI-driven query/command layer.

---

## 1. Core Concept

The proposed ERP replaces much of the traditional navigation-heavy interaction model with a single AI-first workspace.

Instead of asking the user to navigate menus, reports, forms, and modules, the user describes the desired outcome in natural language.

Example:

> “Show me all customers in Germany who have invoices overdue by more than 60 days, grouped by account manager.”

The AI does **not** need to ingest the underlying customer/invoice records into its context. Instead, it receives enough structured metadata to understand the ERP:

- database schema
- tables and fields
- relationships
- business definitions
- business rules
- synonyms
- metrics
- approved joins
- relevant value mappings
- permissions and security context

It then converts the user's intent into a database operation, ideally via an intermediate representation rather than directly generating arbitrary SQL.

Conceptually:

```text
User
  ↓
AI Workspace
  ↓
AI Planner / Intent Layer
  ↓
ERP Semantic Context
  ↓
Query / Command Representation
  ↓
Deterministic Query Compiler or Domain Service
  ↓
Database
  ↓
Structured Result
  ↓
AI Workspace
```

The core insight is:

> **Do not make the LLM the calculator or source of truth. Let the database perform computation against the real ERP data, while the AI primarily interprets and plans.**

---

# 2. Relationship to MVC

A simplified traditional MVC mental model is:

```text
Database ↔ Model ↔ Controller ↔ View
```

For an AI-first ERP, MVC is better treated as a lower-level application pattern rather than the architecture of the entire product.

A more appropriate architecture is:

```text
User
  ↓
Workspace
  ↓
AI Orchestrator
  ↓
Query / Command Layer
  ↓
Business Services
  ↓
Repository / ORM
  ↓
Database
```

The AI behaves somewhat like a **dynamic orchestration/controller layer**, but it should not simply replace traditional controllers with unrestricted SQL generation.

The system needs explicit layers for:

- semantic understanding
- validation
- permissions
- deterministic business rules
- transaction handling
- auditability
- query compilation

---

# 3. Why the Core Idea Is Technically Attractive

## 3.1 Token efficiency

Traditional AI data analysis may involve sending many database records to the model:

```text
Database
  ↓
Thousands of rows
  ↓
LLM
  ↓
Answer
```

The proposed approach is:

```text
User prompt
  +
Relevant schema/semantic metadata
  ↓
AI
  ↓
SQL/query plan
  ↓
Database
  ↓
Small structured result
```

This avoids unnecessarily placing large datasets into the model's context.

The approach can therefore reduce:

- context size
- token usage
- latency
- cost
- exposure of raw data to the model

---

## 3.2 Deterministic computation

For calculations such as:

- SUM
- COUNT
- AVG
- GROUP BY
- joins
- filtering
- date ranges
- aggregations

the database is designed to do the work deterministically.

For example:

```sql
SELECT SUM(amount)
FROM sales
WHERE country = 'SE'
AND date >= ...
AND date < ...;
```

The LLM does not need to calculate the total itself.

---

## 3.3 Fresh data

Because the query runs against the current database, answers can be based on current ERP records instead of information previously seen by a model.

---

## 3.4 Scalability to large datasets

The model can reason over:

```text
metadata + intent
```

while the database processes:

```text
millions of rows
```

This is one of the strongest architectural advantages.

---

## 3.5 Auditability

The system can store an execution trace such as:

```text
user prompt
↓
interpreted intent
↓
semantic model version
↓
query/command
↓
authorization checks
↓
database execution
↓
result
```

That makes it possible to explain where an answer came from.

---

# 4. The Critical Limitation: Query Hallucination

The proposed system reduces one major problem:

### Answer hallucination

```text
User
 ↓
LLM
 ↓
"I think revenue was €8.7M"
```

But it does **not** eliminate hallucination entirely.

It moves the principal failure mode toward:

### Query hallucination

```text
User
 ↓
LLM
 ↓
Wrong SQL
 ↓
Database executes it correctly
 ↓
Wrong business answer
```

This is more subtle and potentially more dangerous because the query may be syntactically valid.

Example:

```text
Business definition of revenue:
gross sales
- discounts
- refunds
- credit notes
```

The model may instead query:

```text
SUM(invoice_total)
```

The database will return a mathematically correct number for the query, but it may still be the wrong business answer.

Therefore:

> **Successful SQL execution does not imply correct business semantics.**

---

# 5. Why Schema + Documentation Alone Is Not Enough

A plain schema such as:

```text
customers
  id
  name
  country
  account_manager_id
```

is not sufficient to fully explain the business.

A serious ERP semantic model should describe things such as:

```text
CUSTOMER

Business definition:
A legal or commercial customer account.

Grain:
One row per customer account.

Synonyms:
customer
client
account
buyer

Restrictions:
Do not count deleted customers.

Country:
Stored as ISO-3166 alpha-2.
```

For metrics:

```text
REVENUE

Business definition:
Net recognized sales excluding VAT.

Formula:
gross_sales
- discounts
- refunds
- credit_notes

Time:
Revenue recognition date.

Do not calculate from:
invoice_total
```

This semantic/business layer is more important than simply giving the model table and column names.

---

# 6. Market Precedents: Is This Already Done?

Yes. The broad approach is already being implemented in several forms.

## Snowflake

Snowflake Cortex Analyst and Semantic Views use business-oriented definitions of:

- metrics
- dimensions
- relationships
- semantic concepts

to translate natural-language questions into queries over physical data.

Snowflake also supports verified-query/evaluation mechanisms to improve reliability.

Source:
https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst

Source:
https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst-evaluations

---

## Databricks

Databricks Genie uses context such as:

- dataset/table descriptions
- relationships
- business instructions
- synonyms
- example queries
- entity/value matching

to convert natural-language requests into SQL.

This is especially relevant because it demonstrates that schema-only prompting is often insufficient; value/entity resolution can also be necessary.

Source:
https://docs.databricks.com/gcp/en/genie/add-instructions

---

## Microsoft Fabric

Microsoft Fabric provides natural-language-to-SQL capabilities that use schema and instructions and can execute generated SQL.

Source:
https://learn.microsoft.com/en-us/fabric/data-science/data-agent-sql-sources

---

## Google BigQuery

Gemini in BigQuery can generate SQL from natural language using schema and metadata context.

Google explicitly notes that generated SQL can be incorrect and should be validated.

Source:
https://docs.cloud.google.com/bigquery/docs/write-sql-gemini

---

## Microsoft Dynamics 365 ERP Analytics

This is particularly relevant because it is close to the proposed ERP use case.

Microsoft's Dynamics 365 ERP Analytics MCP exposes capabilities for:

- obtaining analytical dataset schema
- generating/using analytical queries
- executing them
- returning structured results

Its model includes tables, columns, measures and relationships, and security is enforced during execution.

Source:
https://learn.microsoft.com/en-us/dynamics365/finance/business-performance-analytics/erp-analytics-mcp-overview

Technical details:
https://learn.microsoft.com/en-us/dynamics365/finance/business-performance-analytics/erp-analytics-mcp-technical-details

An important practical observation from Microsoft's architecture is that a complete analytical ERP schema can itself become very large. This supports the idea of **retrieving only relevant semantic context**, rather than passing the entire schema to the model for every request.

---

# 7. The Major Architectural Improvement Recommended

The initial concept is:

```text
Schema + documentation
       ↓
LLM
       ↓
SQL
       ↓
Database
```

A stronger architecture is:

```text
Business Context
       ↓
Relevant Semantic Context Retrieval
       ↓
AI Query Planner
       ↓
Structured Query / Command IR
       ↓
Deterministic SQL Compiler or Domain Service
       ↓
Database
```

The key addition is the **intermediate representation (IR)**.

---

# 8. Why an Intermediate Representation Is Important

Instead of letting the LLM directly produce executable SQL, have it produce a constrained structured representation.

Example:

```json
{
  "entity": "customer",
  "metrics": ["outstanding_receivables"],
  "dimensions": ["account_manager"],
  "filters": [
    {
      "field": "country",
      "operator": "=",
      "value": "Germany"
    },
    {
      "field": "days_overdue",
      "operator": ">",
      "value": 60
    }
  ],
  "sort": {
    "field": "outstanding_receivables",
    "direction": "desc"
  }
}
```

Then deterministic application code converts this into SQL.

This gives:

```text
Natural language
   ↓
AI-generated structured intent
   ↓
Semantic validation
   ↓
Deterministic SQL generation
   ↓
Database
```

instead of:

```text
Natural language
   ↓
AI-generated arbitrary executable SQL
   ↓
Database
```

The second model is much harder to govern.

---

# 9. Think of the System Like a Compiler

A useful mental model is:

### Traditional compiler

```text
Source code
   ↓
Parser
   ↓
Intermediate representation
   ↓
Optimizer
   ↓
Machine code
```

### AI ERP compiler

```text
Human language
   ↓
Intent parser
   ↓
Business Query IR
   ↓
Semantic validation
   ↓
Query optimizer/compiler
   ↓
SQL
   ↓
Database
```

The product is therefore better conceptualized as:

> **A compiler from human business intent into governed executable database operations.**

Rather than merely:

> "AI that writes SQL."

---

# 10. Semantic Context Should Be Retrieved Dynamically

Do not send the entire ERP schema to the model on every prompt.

Instead:

```text
Complete ERP semantic catalog
        ↓
Schema/semantic index
        ↓
User question
        ↓
Retrieve relevant entities
        ↓
Retrieve relevant relationships
        ↓
Retrieve relevant metrics/rules
        ↓
AI
```

For example:

User:

> "Which German customers are overdue?"

The model may only need:

```text
Customer
Invoice
Payment
Currency
Account Manager

Relevant relationships:
Customer → Invoice
Invoice → Payment

Relevant measures:
Outstanding balance
Days overdue

Business rule:
Overdue = due_date < today AND outstanding_balance > 0

Country:
Germany → DE
```

This is essentially a form of **RAG applied to database semantics rather than raw business records**.

---

# 11. Targeted Value Resolution

Schema alone may not tell the AI how business language maps to stored values.

For example:

```text
User says: Germany
Database stores: DE
```

or:

```text
User says: Overdue
Database stores: status = 4
```

The AI should sometimes be able to call a controlled value-resolution mechanism:

```text
resolve_entity("Germany", field="country")
```

and receive:

```text
Germany → DE
```

This avoids exposing the full dataset while still resolving important ambiguities.

Databricks' entity-matching functionality is a concrete example of this design problem.

---

# 12. Treat Read and Write Operations Differently

This is one of the most important recommendations.

## Read path

Example:

> "What were our sales in Sweden last quarter?"

Potential flow:

```text
Prompt
  ↓
Intent
  ↓
Semantic validation
  ↓
Query IR
  ↓
SQL compiler
  ↓
Database
  ↓
Result
```

This can be highly autonomous.

---

## Write path

Example:

> "Increase all laptop prices by 5%."

Do not allow:

```text
LLM
 ↓
UPDATE products ...
 ↓
Production database
```

Instead:

```text
User
 ↓
AI
 ↓
Proposed operation
 ↓
Validation
 ↓
Permission check
 ↓
Business-rule check
 ↓
User confirmation where appropriate
 ↓
Domain command/service
 ↓
Transaction
 ↓
Database
```

The AI proposes a business operation; the deterministic application owns authorization and execution.

---

# 13. Recommended Two-Path Architecture

```text
                    USER
                     │
                     ▼
                AI INTERPRETER
                     │
              ┌──────┴──────┐
              │             │
             READ          WRITE
              │             │
              ▼             ▼
       Query Planner    Command Planner
              │             │
              ▼             ▼
       Query Compiler   Policy Engine
              │             │
              ▼             ▼
             SQL        Domain Service
              │             │
              ▼             ▼
          DATABASE       DATABASE
```

General principle:

- **Read:** AI can plan and query within strict semantic/security constraints.
- **Write:** AI should propose commands, while deterministic application services execute the change.

---

# 14. ERP-Specific Difficulty: Business Semantics

ERP systems are substantially harder than generic analytics because the same word can have multiple valid meanings.

Example:

```text
"Sales"
```

could mean:

- orders booked
- invoices issued
- invoices paid
- recognized revenue
- gross revenue
- net revenue
- revenue excluding VAT
- revenue including VAT

Likewise:

```text
invoice date
≠
posting date
≠
delivery date
≠
payment date
≠
revenue-recognition date
```

The semantic layer must encode these distinctions explicitly.

---

# 15. ERP-Specific Difficulty: Joins

A query can be syntactically valid but semantically wrong because of join multiplication.

For example:

```text
Customer
   ├── Orders
   └── Payments
```

A naïve join can create:

```text
Customer × Orders × Payments
```

and inflate totals.

Therefore the semantic layer should encode:

- approved join paths
- relationship cardinality
- entity grain
- aggregation rules
- safe metrics
- known dangerous joins

This is one reason enterprise semantic layers are valuable.

---

# 16. Consider Canonical Analytical Views

Do not necessarily expose every raw ERP table to the AI.

A useful architecture can be:

```text
Raw ERP tables
      ↓
Canonical / analytical views
      ↓
Semantic layer
      ↓
AI
```

For example:

```text
Raw:
invoice_header
invoice_lines
credit_notes
payments
tax
...

Canonical:
sales_fact
customer_balance
inventory_position
purchase_commitments
```

This simplifies the AI's search space and reduces the number of ways it can compose incorrect queries.

---

# 17. Consider CQRS / Separate Analytical Read Models

A serious ERP can benefit from separating:

- transactional OLTP storage
- analytical/read-optimized storage

Conceptually:

```text
                 TRANSACTIONAL SIDE
                        │
                ERP primary database
                        │
                        ▼
                    Event Bus
                        │
                        ▼
                 ANALYTICAL SIDE
                        │
                optimized read models
                        │
                        ▼
                    AI Queries
```

The AI should not necessarily run large analytical queries directly against the live transactional model.

Microsoft's Dynamics ERP Analytics approach is an example of analytical data being transformed into structures optimized for business analysis.

---

# 18. Workspace as a First-Class Product Surface

The workspace should not be limited to chatbot text.

The AI could generate:

- tables
- charts
- summaries
- forms
- reports
- filters
- drill-downs
- workflows
- action controls

Example:

```text
┌──────────────────────────────────────────────┐
│ OVERDUE CUSTOMERS                            │
│                                              │
│ Customer    Balance    Days    Manager       │
│ Acme        €82,400     72     Anna          │
│ Globex      €61,200     51     David         │
│ ...                                          │
│                                              │
│ [Export] [Group by manager]                  │
│ [Create collection tasks]                    │
└──────────────────────────────────────────────┘
```

This changes the product from:

> "an ERP with a chatbot"

into:

> **"an ERP whose workspace is dynamically constructed around the user's intent."**

---

# 19. Make Query Provenance Visible

Every AI result should ideally carry structured provenance:

```json
{
  "answer": "...",
  "query": "...",
  "semantic_model_version": "...",
  "data_timestamp": "...",
  "filters": "...",
  "metrics": "...",
  "execution_id": "..."
}
```

The user might simply see:

```text
€8.73M
```

with optional:

```text
Definition
Calculation
Filters
Data as of
View SQL
```

This is important for enterprise trust and auditing.

---

# 20. Version the Semantic Model

Business definitions can change.

For example:

```text
Semantic Model v4
Revenue = invoiced sales - refunds
```

later becomes:

```text
Semantic Model v5
Revenue = recognized revenue - refunds
```

Every result should record the semantic model version used.

This supports:

- reproducibility
- auditability
- debugging
- controlled upgrades
- understanding why historical answers changed

---

# 21. Security Architecture

The AI should not be the authority for permissions.

Use:

```text
AI
 ↓
Proposed operation
 ↓
Policy / permission engine
 ↓
Execution
```

Never assume:

```text
LLM knows what user is allowed to do
```

Instead the deterministic application should enforce:

- row-level access
- company/legal-entity scope
- role permissions
- field-level restrictions
- write permissions
- transaction limits
- approval thresholds

Least-privilege access should be a foundational design principle.

Relevant security guidance:
https://genai.owasp.org/llmrisk/llm01-prompt-injection/

---

# 22. Query Validation Pipeline

A safer read pipeline is:

```text
User request
    ↓
AI planning
    ↓
Semantic validation
    ↓
Structured Query IR
    ↓
SQL compiler
    ↓
SQL parser / validator
    ↓
Permission check
    ↓
EXPLAIN / dry run where useful
    ↓
Cost / row-limit guard
    ↓
Execute
    ↓
Result validation
    ↓
Workspace
```

Important checks include:

- allowed entities
- allowed fields
- allowed joins
- correct metric definitions
- correct time semantics
- user permissions
- excessive query cost
- unsafe result size
- read-only enforcement

---

# 23. Evaluation Framework

The system should be tested like a compiler and business system, not merely as a chatbot.

Create an ERP-specific evaluation suite covering:

- revenue
- VAT
- refunds
- credit notes
- currencies
- exchange rates
- fiscal periods
- time zones
- multi-company
- inventory
- committed stock
- backorders
- accounting dates
- permissions
- soft deletes
- duplicate joins
- ambiguous questions
- large queries
- missing values
- entity resolution
- unauthorized writes

Test at several levels:

```text
Natural language
    ↓
Expected business meaning
    ↓
Expected semantic plan
    ↓
Expected query
    ↓
Expected result
```

The key metric is not simply:

> "Did the SQL compile?"

but:

> **"Did the system produce the correct business interpretation and the correct result under the user's authorization context?"**

---

# 24. What Is Already Commodity vs. What Could Become the Moat?

The following are increasingly commoditized:

```text
LLM
Natural-language-to-SQL
Chat interface
Basic schema retrieval
Basic tool calling
```

More defensible product infrastructure could be:

```text
ERP business ontology
Semantic metric definitions
Validated relationship graph
Approved join paths
ERP-specific query compiler
Business rules
Permissions
Transaction engine
Audit/provenance
Semantic-model versioning
ERP evaluation suite
Dynamic workspace
Agentic workflows
```

The LLM should therefore be treated as a replaceable reasoning engine.

The ERP's durable value is the **business semantic and execution layer**.

---

# 25. Proposed Long-Term Architecture

```text
┌───────────────────────────────────────────────────┐
│                  AI ERP WORKSPACE                 │
│                                                   │
│ Prompt │ Tables │ Charts │ Forms │ Workflows     │
└────────────────────────┬──────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────┐
│              AI ORCHESTRATION LAYER               │
│                                                   │
│ Intent detection                                  │
│ Planning                                          │
│ Clarification                                     │
│ Context selection                                 │
└────────────────────────┬──────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────┐
│                SEMANTIC LAYER                    │
│                                                   │
│ Entities                                          │
│ Fields                                            │
│ Relationships                                     │
│ Metrics                                           │
│ Business rules                                    │
│ Synonyms                                          │
│ Approved joins                                    │
│ Value dictionaries                                │
│ Security policies                                 │
│ Example queries                                   │
└────────────────────────┬──────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────┐
│                 QUERY / COMMAND IR                │
│                                                   │
│ Entity │ Dimensions │ Metrics │ Filters           │
│ Time semantics │ Sort │ Limit │ Operation type    │
└───────────────┬────────────────────┬───────────────┘
                │                    │
               READ                 WRITE
                │                    │
                ▼                    ▼
       ┌────────────────┐    ┌────────────────────┐
       │ Query Compiler │    │ Policy / Services  │
       └───────┬────────┘    └─────────┬──────────┘
               │                       │
               ▼                       ▼
             SQL               Transaction engine
               │                       │
               └───────────┬───────────┘
                           ▼
                   ┌─────────────────┐
                   │ Data Platform   │
                   │                 │
                   │ OLTP + OLAP     │
                   │ Read Models     │
                   └─────────────────┘
```

---

# 26. Evolution Path

## Stage 1 — AI SQL Assistant

```text
Prompt → SQL → DB → Answer
```

Purpose:
- prototype
- validate demand
- establish evaluation baseline

---

## Stage 2 — Semantic SQL Assistant

```text
Prompt
 ↓
Schema + business definitions
 ↓
SQL
```

Purpose:
- improve semantic correctness
- introduce business terminology

---

## Stage 3 — Query Compiler

```text
Prompt
 ↓
Business intent
 ↓
Query IR
 ↓
Deterministic SQL
```

Purpose:
- reduce arbitrary SQL generation
- add formal validation

---

## Stage 4 — AI ERP Workspace

```text
Prompt
 ↓
Query / chart / table / report / action
 ↓
Interactive workspace
```

Purpose:
- make AI the primary ERP interface

---

## Stage 5 — Agentic ERP

Example:

> “We have €2.1M in overdue receivables. Identify the largest risks, prepare collection actions, and draft follow-up emails.”

Flow:

```text
Observe
  ↓
Analyze
  ↓
Plan
  ↓
Request approval
  ↓
Execute
  ↓
Verify
  ↓
Report
```

This moves beyond NL-to-SQL toward an AI-controlled business operating layer.

---

# 27. Advantages

### Technical / operational

- Lower token use for large data queries
- Reduced need to expose raw records to the LLM
- Database performs deterministic aggregation/calculation
- Fresh results from live data
- Better scalability for large datasets
- Strong auditability if query provenance is retained
- Model can be swapped without redesigning the data model
- AI can become a universal interface over multiple ERP domains

### Product

- Less menu-driven navigation
- Lower training requirements
- Natural-language access to complex reports
- Dynamic tables/charts/workflows
- Potentially much faster discovery of ERP information
- One interface across many modules

### Strategic

- Semantic model can become a core ERP asset
- Business definitions can be standardized
- AI layer can sit above an existing deterministic ERP
- New LLMs can be adopted over time

---

# 28. Disadvantages / Risks

### 1. Wrong query semantics

The biggest technical risk.

The query may execute successfully but answer the wrong business question.

### 2. Ambiguity

Words such as:

- sales
- profit
- active
- customer
- inventory
- overdue

can have multiple valid interpretations.

### 3. Schema complexity

Large ERP schemas can overwhelm the model if all context is supplied at once.

### 4. Join errors

Incorrect joins can silently produce incorrect totals.

### 5. Value/entity mismatches

Human language may not match database codes.

### 6. Security

AI-generated queries must not bypass authorization.

### 7. Writes are much more dangerous

A wrong read is undesirable.

A wrong write can damage the business.

### 8. Query cost

Poorly generated queries can be expensive or slow.

### 9. Database coupling

Direct SQL-generation architectures can become tightly coupled to a specific database/schema.

### 10. Semantic maintenance

The semantic model must be updated whenever ERP concepts/business rules change.

---

# 29. Recommended Enhancements

Highest-value improvements:

## A. Semantic layer

Build a formal business semantic model rather than simple schema documentation.

## B. Dynamic schema retrieval

Retrieve only relevant semantic context per request.

## C. Query IR

Have the AI generate a constrained structured representation.

## D. Deterministic compiler

Compile the IR into SQL rather than trusting arbitrary SQL output.

## E. Separate read/write paths

Treat analysis and mutation as different security domains.

## F. Approved join graph

Encode safe relationship paths and cardinality.

## G. Entity/value resolution

Resolve human terminology against controlled database values.

## H. Analytical read models

Use analytics-optimized structures for large analytical questions.

## I. Provenance

Record semantic model version, query, filters, execution ID and data timestamp.

## J. Evaluation suite

Continuously test business correctness, not just SQL syntax.

## K. Human confirmation for high-impact writes

The AI proposes; deterministic services execute.

---

# 30. Main Architectural Principle

The most useful refinement of the original concept is:

> **Do not build an ERP where AI writes SQL. Build an ERP where AI compiles human business intent into governed database operations.**

Then assign responsibilities like this:

```text
LLM
= understands intent

Semantic Layer
= understands the business

Query / Command IR
= represents intent safely

Compiler
= translates intent into executable operations

Database
= computes truth from real data

Policy Engine
= controls what the user is allowed to do

Transaction Engine
= changes ERP state safely

Workspace
= presents the result and next actions
```

---

# 31. Final Verdict

## Core idea

**Technically strong and well aligned with current enterprise AI architecture trends.**

The basic principle — use the model to interpret intent and let the database compute over actual records — is sound.

## Originality

**The broad NL → semantic context → query → database pattern is not novel.**

Commercial implementations exist today across data platforms and ERP analytics systems.

Therefore the product should not be positioned internally as:

> “We invented AI-to-SQL.”

The differentiation should instead come from the **ERP-specific semantic, business-rule, permission, transaction and workspace architecture**.

## Token efficiency

**A genuine advantage**, especially for large ERP datasets.

However, selective value resolution and semantic-context retrieval are often necessary.

## Hallucination

The approach greatly reduces **answer hallucination**, but moves the main reliability problem toward **query/semantic hallucination**.

That can be mitigated with:

- semantic definitions
- constrained IR
- deterministic compilation
- validation
- approved joins
- evaluation
- provenance
- permissions

## Product opportunity

The interesting product is not:

> “ERP + chatbot.”

It is:

> **“An AI-native business operating layer over a deterministic ERP core.”**

The user's natural language becomes the primary way to discover information, generate analyses, and initiate workflows, while the underlying ERP remains deterministic, auditable and governed.

## Recommended strategic architecture

```text
                HUMAN
                  │
                  ▼
        Natural Language Workspace
                  │
                  ▼
          AI Planning Layer
                  │
                  ▼
        ERP Semantic Layer
                  │
                  ▼
          Query / Command IR
                  │
          ┌───────┴────────┐
          │                │
         READ             WRITE
          │                │
          ▼                ▼
   SQL Query Compiler   Domain Commands
          │                │
          ▼                ▼
      Data Platform    Transaction Engine
          │                │
          └───────┬────────┘
                  ▼
        Verified Structured Result
                  │
                  ▼
             AI Workspace
```

**Bottom line:**

The original insight is good:

> **Let the AI understand the business; let the database do the computation.**

The stronger evolution is:

> **Let AI interpret and plan, let a semantic layer define what business concepts mean, let deterministic software compile and govern the operation, and let the database remain the source of computational truth.**

That is the architecture worth pursuing.
