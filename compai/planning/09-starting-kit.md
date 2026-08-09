# 09 — The Starting Kit

**What this is:** Open Mercato with the shop/warehouse parts removed. The thing
we start building on top of.
**Written in plain language on purpose.** Every item below was checked in the
code, not taken from their documentation.

---

## 1. What the Starting Kit is, in one paragraph

A working web platform that already knows how to be **many companies at once**,
how to **let people log in and control what they can touch**, how to **add new
features as plug-in modules**, how to **store custom data that customers define
themselves**, how to **search it**, how to **run long business processes with
human approval steps**, and how to **let an AI assistant do work safely and ask
permission before it changes anything**. It has no sales, stock, invoices or
shipping in it — we take those out.

---

## 2. What is inside

### 2.1 The foundation — the boring parts that always take longer than expected

| What | What it gives us |
|---|---|
| **Module system** | New features are added as self-contained modules. Each brings its own screens, APIs, database tables, permissions, translations and background jobs. |
| **Automatic wiring** | A build step finds every module and connects it up. If a module needs another module that is switched off, **the build refuses to run**. Nothing half-connected can ever start. |
| **On/off switch per module** | One file lists which modules are active. Turning something off removes it from the whole app — no code changes. |
| **Three ways to customise** | Switch a piece off, replace one file, or copy a whole module and own it. None of these require changing the original code. |
| **Database migrations** | Each module owns its own database changes, and the system can detect when the code and the database have drifted apart. |
| **Service wiring (DI)** | Services are registered in a central place rather than hard-wired, so any of them can be swapped out later. |
| **Background jobs** | Queues, scheduled jobs, and retry handling. |
| **Events** | Modules talk to each other by announcing what happened, never by calling each other directly. |
| **Caching and rate limiting** | Ready and configurable. |
| **Command-line tools** | For setup, seeding, migrations and maintenance. |

### 2.2 Companies, people and permissions

| What | What it gives us |
|---|---|
| **Multiple companies (tenants)** | Every piece of data belongs to a company. Companies never see each other's data. |
| **Company structure** | Companies contain organisations in a tree — head office, branches, departments — with fast "who is above/below whom" lookups. |
| **Users, roles and permissions** | Permissions are named things like `auth.users.create`. Roles collect permissions. People get roles. |
| **One security gate** | **Every** API request goes through one place that checks who you are and what you are allowed to do. Nobody can accidentally skip it. |
| **Machine access (API keys)** | Non-human callers can act with their own permissions, without pretending to be a person. |
| **Login and sessions** | Working login, password rules, password reset, invitations. |
| **Field-level encryption** | Sensitive fields can be encrypted, with keys held in a vault, and still searched. |

### 2.3 Data that customers can shape themselves

| What | What it gives us |
|---|---|
| **Custom fields** | Add new fields to any existing record type, without a developer. |
| **Custom objects** | Create entirely new record types, without a developer. |
| **Forms and tables** | Screens for these are generated, with validation. |
| **Saved views** | Users can save their own filtered table layouts. |
| **Import/export** | CSV and spreadsheet import, export of table data. |
| **Dictionaries** | Shared lookup lists (statuses, categories, types) reusable across modules. |

### 2.4 Finding things

| What | What it gives us |
|---|---|
| **Search index** | A searchable copy of every record, kept up to date automatically. |
| **Meaning-based search** | Records are also stored as vectors, so "find things like this" works, not just exact words. |
| **Encrypted search** | Even encrypted fields stay searchable. |
| **Index health** | The system **measures how much of its own data is actually indexed** — so "the search may be out of date" is a number, not a guess. |

### 2.5 Processes and rules

| What | What it gives us |
|---|---|
| **Workflow engine** | Multi-step business processes that can run for days or weeks: branch into parallel paths, wait, retry, and rejoin. |
| **Human steps** | A workflow can stop and give a person a task, with a form, a deadline, a claim button and automatic escalation if nobody responds. |
| **Business rules** | "If this, then that" rules defined as data — conditions, actions on success, actions on failure, priority order — plus a log of every rule that ran and why. |
| **Undo and redo** | Changes are recorded as commands with a before-and-after snapshot. **70 different operations can genuinely be undone.** |
| **Change journal** | Every change records who did it, what changed, and the exact fields that changed. |

### 2.6 The AI layer

| What | What it gives us |
|---|---|
| **AI agents defined per module** | Each module can ship its own assistant with its own instructions and tools. |
| **Tools with permissions** | An agent can only call tools it has been granted. |
| **Ask-before-changing** | An agent that wants to change data creates a **pending action**: a proposal showing exactly which fields would change. A person approves or rejects it. Proposals expire, cannot be applied twice, and are rejected if the record changed in the meantime. |
| **Three levels of trust per agent** | Read-only · must confirm every change · must confirm destructive changes. A setting can only make an agent **more** restricted, never less — attempts to widen are rejected. |
| **Model control** | Which AI providers and models are allowed can be set per company and per agent. |
| **Spending controls** | Each AI turn can be capped by number of tool calls, elapsed time, and tokens used. Exceeding a cap stops the run and records why. |
| **Cost tracking** | Token use recorded per agent, per module, per user, per conversation, per step, plus daily totals. |
| **Editable instructions** | Agent instructions are stored in the database, versioned, and can be adjusted per company. |
| **MCP support** | Can both use external AI tools and expose its own tools to other AI systems. |
| **Chat** | Conversations with multiple participants and message history. |

### 2.7 Communication and connections

| What | What it gives us |
|---|---|
| **Notifications** | In-app and email, with templates. |
| **Messages and inbox** | A shared inbox that can pull in email. |
| **Email-to-work agent** | An AI module that reads incoming email and turns it into actions. |
| **Integrations framework** | A standard way to connect outside systems, with sync jobs and error handling. |
| **Webhooks** | Incoming and outgoing, with signature checking. |
| **File storage** | Attachments, with S3-compatible storage. |

### 2.8 The interface

| What | What it gives us |
|---|---|
| **Admin interface** | Working screens: lists, filters, forms, detail pages, dialogs. |
| **Design system** | A large shared component library with a linter that enforces its use. |
| **Dashboards and widgets** | Modules can contribute dashboard tiles and inject panels into other modules' pages. |
| **Four languages** | English, German, Spanish, Polish — with **an automated check that fails the build if someone hard-codes text** instead of translating it. |
| **API documentation** | Generated automatically from the code. |

### 2.9 Running it

Docker setup, deployment configs, health checks, structured logging, performance
monitoring, and a full automated test setup with per-module unit and integration
tests.

---

## 3. What we take out

| Removed | Why |
|---|---|
| Customers/CRM, sales and orders, product catalogue, warehouse, shipping, payments, currencies, customer portal, checkout, Stripe, product-data sync, CMS, onboarding flows | Shop and ERP features. Not our product. |
| The **enterprise** package (record locking, single sign-on, security add-ons, status overlays) | **Commercially licensed** — not ours to use or build on. Note this means the free half has **no record locking and no single sign-on**; we add our own. |

That is roughly **520,000 lines removed**, leaving roughly **800,000**.

### Possibly also out — decide after a quick look

Staff/employees, work planning, resource scheduling (~58,000 lines) touch our
workforce ideas, so they are worth reading before deleting. Email channel
connectors (~7,500) only matter if we keep the email inbox.

---

## 4. What the Starting Kit does **not** give us

This is the part we build. It is also the part that is our actual product, so
this list is a feature, not a gap.

| Missing | What we build |
|---|---|
| A proper identity for AI workers | AI workers as real staff members with their own identity, not a machine key |
| Job descriptions for AI workers | The **Charter** — role, manager, skills, knowledge, limits, working method |
| Earned trust | Trust levels that rise with a good track record and drop automatically after an incident |
| Sensitivity of work | Task grades, so a risky job is treated differently from a routine one |
| One consistent permission ladder | Their AI has 3 levels; people have yes/no. We need one 6-level ladder for everyone |
| Explained decisions | Right now a refusal is just "forbidden". We need "why", in a sentence |
| Tamper-proof history | Their change log can be edited. We add a sealed, verifiable record alongside it |
| Handing over authority | Temporary delegation — "you may approve refunds under €500 until Friday" |
| One name for one thing | Recognising that a customer in three systems is one customer |
| Tags and saved scopes | Hashtags, lenses and knowledge cells |
| @mentions | Addressing people, roles, teams and AI workers, and asking them to do things |
| Company knowledge | A governed knowledge base with sources, review states and citations |
| Building a company from a description | The Company Compiler and Industry Packs |

---

## 5. Honest summary

The Starting Kit gives us **a working, multi-company, modular business platform
with a genuinely good AI safety layer** — and none of the company-operating
intelligence that makes our product what it is.

Put simply: **it is the building, the wiring and the security desk. We supply the
company that lives in it.**
