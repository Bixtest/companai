# Glossary — every term, in plain words

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold

Alphabetical. Written for someone who is not a developer. Where the project uses a term that collides with
an everyday word, the collision is called out — those are the ones that cause real confusion.

---

### Agent
An AI worker. A real object in the system, owned by someone, acting as someone, with a role. Not a
configuration file, not a chatbot session. **See also: AI user, Agent runtime.**

### Agent runtime
The engine that does the actual thinking when the AI works. Today it is a piece of software called
OpenCode; the plan is that it should eventually be Hermes, reached through a single, typed door so nothing
in the platform talks to an engine directly.

### AI user
A machine identity allowed to act. It is a distinct kind of actor, not a person in disguise — and it can
be bound to specific agents, specific tools, and a specific scope. **An AI user can run only the agents it
is bound to, and nothing else.**

### Autonomy level (or "gate")
The answer to *"may this act proceed, and under what conditions?"* Six values, from blocked up to execute
and log. Always worked out by taking the **lowest** level that any applicable rule produces — nothing can
raise it. **See also: Ceiling.**

### Backlog
The project's single list of everything left to do, in order. There is deliberately only one; a second
competing list is treated as a defect.

### Business IR (Intermediate Representation)
A **typed business request**. It says "list these orders, for this customer, over this period, sorted this
way" in a fixed, checkable shape. It is deliberately **not** database query language and **not** code.
**This is the wall between "the AI guessed something" and "the database changed."** The AI may produce
this and nothing lower-level.

### Business Model Kernel
The single, precise, versioned description of what the business *means*: its things, its fields, its
relationships, its rules. Everything else is produced from it. It is a **view** over what the platform
already declares — it holds no second copy, so there is only ever one source of truth.

### Business Widget ("Widget")
A saved, reusable **interaction** — something that shows data and lets a person act. It holds no data of
its own; it points at a Function or a kind of business thing.
⚠️ **Name collision:** the base platform already uses "widget" for a dashboard *tile* (a piece of screen).
This document calls that a **tile** or an **injection widget** to keep them apart.

### Callback (in the register)
A piece of work recorded as "partly done", together with the observable event that will let it be
finished. The register exists so a half-finished thing is never forgotten.

### Capability
One specific thing that can be done, with a declared risk level, a declared reversibility, and a declared
data sensitivity. Examples: read a customer, send an invoice, change a role.

### Ceiling
Any rule that limits what an actor may do. Every applicable ceiling is counted and the **lowest** wins.
**Nothing anywhere can raise a gate.**

### Command
A typed, named, reversible-or-not action that changes something. Every state-changing action goes through
one command path rather than a raw write. Each command declares what it is: what it needs, what it does,
how to undo and redo it, its risk, whether it needs approval, and how to avoid doing it twice.

### Companion / Companai
⚠️ **Two different products are called Companai.** One is ours. One is a **sibling project** on a
different base. The sibling's code and documents sit in the library only as *lessons*. If you are about to
read a "Companai" document, check its path first. And note the outer folder is `companai` while the inner
one is `compai` — both spellings are real, and neither is a typo to fix.

### Compiler
The thing that turns a typed business request into a real operation against the real data, checking it
against the business model as it goes. It reports two kinds of problem: an **error** (the request is
invalid, so nothing runs) and a **gap** (the request is valid but the platform cannot yet serve it — so
the compiler doubles as a measurement of what the platform can do).

### Custom entity / custom field
A kind of business thing, or a piece of information on it, that a user declares rather than a developer
codes. Creating one forces the permissions question before it is applied.

### Data axis
The (not yet built) layer that answers *"may **this** person read **this row**, for this purpose?"*
Today the platform answers *"may this person read **this kind of thing**?"* Several other things wait on
it.

### Delegation
Lending someone part of your authority for a period or a purpose. Both ends are real people or real
agents. **Authority travels down and never grows.**

### Denial
An explicit withholding of a permission. It applies even to the most senior administrator. The out-of-band
lever for when something has gone badly wrong.

### Docked chat
The existing AI conversation surface, which can be attached to the side or bottom of the screen. It works;
the plan is to extend it into a workspace rather than replace it.

### Drift
When two things that should agree no longer do — for example the business model's view of a table and the
installer's view of it. The project has tests that prove they still agree.

### Effect class
How dangerous an action is, on a scale from "read" up through reversible writes, irreversible writes,
external communication, money, security changes, to destruction. It is one of the inputs to the autonomy
decision.

### Embedding lane
The separate path that turns text into numbers for search. It is the one place the platform is **not**
provider-neutral: a closed list of six providers, and its OpenAI client ignores the configured address —
which is the root cause of the recorded blocker that stopped the local tool-search index from working.
**It fails as a warning, not a gate**, which is why it is easy to miss.

### Enforce / shadow mode
**Shadow**: every decision is worked out and logged, but nothing is refused. A measurement, not a policy.
**Enforce**: refusals actually happen. The operator is expected to read their own shadow report before
switching.

### Envelope
The package the platform hands to the AI engine for every run. Generated by the platform, immutable, and
versioned. It carries who is acting, which tenant, which agent, **which grant of authority**, the
deadline, the budget and a trace id. **Identity fields are read-only to the engine — it cannot name its
own tenant.** Secrets appear as *references*, never as values.

### Escalate (a third guard outcome)
A guard may answer *"allowed, but a person must decide"* — which is **not** the same as allowed. The act
does not happen, no event is emitted, and the response says plainly that it is waiting for a person.

### Fingerprint
A short, stable fingerprint of a Function's **content** — deliberately excluding its name, description and
version, so renaming it does not invalidate its verification. There is a separate fingerprint of the
*compiled plan*, so "the user changed this" can be told apart from "the business model moved".

### Five agent kinds
The owner's answer to "what kinds of AI worker exist": **personal** (one person's, private) · **role**
(everyone holding a role) · **context** (company-owned, acting as a named user) · **independent** (a
worker in its own right) · **system** (an admin's, acting as a platform function). **Two of the five are
not assistants at all** — they have no person they serve. Decided 2026-10-05.

### Flawless (the bar for saving a Function)
**Machine-checked, not "it looked right once."** The save option is not offered — with the failing check
named — until an objective set of checks passes. One of those checks (permissions) is currently *not
checked*, and that is shown rather than hidden.

### Function
A saved, reusable business operation that runs with **no AI**. It carries its typed request, its
parameters, and the versions it was built against. It goes through an eight-state life and cannot skip a
step.

### Gap (two meanings — check which)
1. A problem in a requirement or a plan that has been identified and named.
2. A diagnostic from the compiler meaning "this request is valid but the platform cannot yet serve it".

### Guard
A named check that runs before a write is applied. Guards are registered, ordered, and can be scoped to a
kind of object and an operation. A guard may allow, refuse, or **escalate**.

### Hermes
The **agent runtime** the platform is designed to use for its AI. A Python program (~898,000 lines of
Python excluding tests), **borrowed** rather than ours, running as its own container and reached over
HTTP. It supplies the reasoning loop, tool orchestration, context assembly, provider breadth, sessions,
skills and memory. It holds **no business data** and owns **no business truth**: *"Hermes can learn how to
use the business system; the platform defines what the business system means."* See
[`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md).

### Headless
What Hermes must be: it runs with no interface of its own. **The platform owns every screen a person ever
sees.** Hermes ships a dashboard and a desktop client; this product uses neither. It is also one of the
four things that must never be possible — no Hermes account or pairing flow may become a way to be
somebody.

### Hostile critic
A separate agent whose only job is to prove a conclusion wrong, required to give a command and its output
for every claim. A review that says "looks good" without naming what it tried to break has not done its
job. This practice has found real defects that reading code had missed.

### Injection widget
The base platform's **rendering** object — a small piece contributed into a named *spot* in a screen, or a
menu item contributed into the menu. The word "widget" here means the tile, not the Business Widget.

### Inbox (the approvals queue)
**Settings → Authority → Approvals.** Two lists on one screen: things that have **not happened yet**
(approving runs them) and things that **have happened** (someone should look). They never share a row or a
button.

### Kernel
Short for the Business Model Kernel. **See: Business Model Kernel.**

### llama.cpp / the model server
The local inference engine, running as its own container and serving an OpenAI-compatible endpoint. Today
it serves a quantised 7B Qwen model with a 64K-token window. **Reached the same way any other provider is
reached** — the platform treats it as a base URL, not a library, because the app is Node and llama.cpp is
C++. Its thread split (4 generation / 8 prompt) was measured, and the free 46% that produced is the only
performance claim in this project that was earned by measurement. It does **chat**; it does not do
**embeddings**, which is a separate, unfixed defect.

### Lesson
A numbered entry recording a mistake this project already made, written in its general form so it is not
repeated. The file binds in both directions: **read it before you start, and add to it before you finish.**

### Model proposal
One of the three endings: the request needs new structure. It is fenced behind validation, impact
analysis, approval and migration, and **never happens on the AI's own initiative.**

### Model preset
One entry in the platform's provider list, carrying its own base-URL and API-key environment names. There
are **eleven**, and adding a twelfth — including llama.cpp — takes **one entry and no new code**. The
rule the owner added: **every provider gets its own preset with its own names**, so no vendor's name is
ever a routing hint for somebody else's model.

### MCP
The protocol the AI uses to reach the platform's tools. It is **the only door to a business operation**:
every call re-authorises against current state, and no runtime ever gets a direct database handle. Sprint
0 proved 21 platform tools discovered over it. One detail worth knowing: the endpoint accepts `x-api-key`
or `Authorization: ApiKey …` and **not** `Bearer`.

### Mutation proof (RED-then-GREEN)
Deliberately breaking a piece of code to prove a test actually detects the thing it claims to detect,
then restoring it and checking the restore is byte-identical. A test that cannot fail proves nothing.

### `OM_ENABLE_EXAMPLES`
A switch that turns on the example modules, which are kept as working reference code and are off by
default.

### One number
The scoreboard's headline figure, **derived from the ticked boxes rather than typed**. If the number and
the boxes disagree, the number is the defect.

### OpenCode
The **incumbent** agent runtime. A Go-based AI backend running as its own container and reached over HTTP;
the platform's chat route is wired to it today. **It is load-bearing, which is why replacing it is a
rewire-then-delete migration and not a switch.** Tracked separately as N-8.

### Organisational graph
The structure of organisations, and the declared relationships between them (owns, manages, advises,
serves, licenses, templates, supervises). Authority ceilings are inherited down it, and an edge can also
block a specific capability outright.

### Permanently parked
A module that is switched off — it creates no tables, serves no routes, loads no code — but whose source
stays readable and restorable by removing one comment. **Fourteen of them.** Parking is preferred over
deleting; the project once nearly lost a feature because a module was labelled "CRM".
⚠️ The base platform's `customers` module is parked **even though it is the reference example** for how to
build a module. It stays readable on purpose.

### Placement
Where a saved Function or Widget appears: its **address** (a canonical path like
`team.reports.overdue`) and its human-readable label. The address is identity and may not change; the
label may change freely.

### Platform points
The scoreboard: one number and one list, written so each row says **what you can do after it is done**,
in plain words, sorted in the vision's own build order.

### Precedence (of documents)
When two documents disagree, the order is: explicit architectural invariants, then the latest
design-control architecture, then a later refined subsystem design, then an earlier design, then
brainstorming, then vendor-specific details. **A lower level may never redefine a higher one** — a database
column name must not quietly become the definition of a business concept, and an AI's interpretation must
not quietly become a business rule.

### Principal
The thing that acts: a person, an AI worker, a service, or the system itself. Every act names its
principal, whom it acted on behalf of, and which grant of authority permitted it.

### Record lock
Freezing a specific record. **Locked** means nobody may write it; **restricted** means a write needs
approval first. **Reads are deliberately exempt** — a record nobody may read is a record nobody can
examine before deciding to unlock it. If the platform cannot tell the state, it treats the record as
locked.

### Register (the completion callbacks)
The list of every partly-built thing, with its gap, the prerequisite that must land, the observable event
that means it has landed, and the work to do then.

### Reversibility
Whether a capability's effects can be undone, compensated, or not undone. **Something irreversible can
never be left to an after-the-fact review.**

### Sandbox
A preview environment for anything the AI proposes, run with dummy, masked or read-only data, with **no
real change possible**. Also the name of the isolated worker where code-mode tools execute — with a
whitelist, a timeout, a cap on calls and per-endpoint permission checks.

### Runtime state
What the AI engine holds while it works — the message buffer, compression artifacts, indexes.
**Disposable and rebuildable by design**: deleting it must never delete a business fact. Isolating it per
tenant and per agent, with export, backup, deletion and retention, is a named gap.

### Scoreboard
**See: Platform points.**

### Scope
What data an actor may reach — which tenant, which organisation. **The typed business request carries no
scope at all**, so a request cannot widen its own reach. Scope is injected by the platform from the
authenticated request, and a saved capability's own tenant is re-checked when it runs. Two independent
channels, and both fail closed.

### Spot
A named place in a screen where a small contributed piece can be mounted. The word "widget" for such a
piece means the tile, not the Business Widget.

### The typed port (the only door)
The single boundary between the platform and the AI engine. Eight operations, and **everything crosses
it** — there is no back door: not a Hermes dashboard, not a direct database connection, not an ambient
credential. The design is written; **nothing uses it yet.**

### **The Studio** (proposed)
The owner's name for a proposed hub where functions, widgets, widget pages and menu items are all listed
and managed the same way, plus a database editor. Its key distinction: **"allow you to use it" is not the
same as "post it into your interface"** — the second risks spam. Still awaiting the owner's go-ahead.

### Skill
A learned procedure, held in a governed catalogue: provenance, a scan result, a version, an approval, a
pin, a rollback and a revocation. **This is "Hermes learns as you go"** — and it is the most dangerous
capability in the design, because it is the one that changes behaviour over time. Five rules keep it safe:
a skill is a proposal until approved; **a skill cannot widen authority**; pinning beats learning; deletion
is real; and retrieval never promotes a cached guess into a record. **Not built.**

### Tenant
One company using the platform. A hard wall separates one tenant's data from another's, and the platform
adds that filter itself on every read and write.

### Thread
One conversation-with-work inside a workspace. It may hold messages, notes, layout and comments.
**It may never be the authority for a business record** — it starts work by calling a Function or a
command, and those carry their own permissions.

### Token metering
Token usage is recorded per event and per day. **Budgets, ceilings and per-tenant quotas are not
enforced** — and the honest bound is that a budget blocks *new* work and pauses a scope; **cancelling a
run already in flight is a separate, best-effort action** that must be named as one.

### Trust
What an actor has earned. It is computed from evidence, not asserted. **Promotion is slow, needs evidence,
and needs a person. Demotion is automatic and immediate.** An actor with no trust record gets no benefit of
the doubt.

### Two routes
The project's rule for reaching an important answer: get there by two genuinely different methods and make
them agree. Re-running your own check is **not** a second route.

### UMES
The base platform's existing extension system. It already enumerates four ways to extend the product —
enrichers, interceptors, component overrides, and injection widgets — so "add a widget over time" extends
something real rather than inventing a new mechanism.

### Verification
The objective set of checks that must pass before a Function may be marked verified. It **calls the
compiler** rather than re-implementing its checks. One of the checks is currently always *not checked*,
and that is recorded rather than passed.

### Where used / depends on
Questions the registries answer: where is this thing used, and what depends on it? These are what make
"what breaks if I rename this field?" answerable.

### Widget
⚠️ **Ambiguous — check which one is meant.** Either a **Business Widget** (a saved interaction) or an
**injection widget** (a tile contributed into a spot). Also, the footprint of this ambiguity is recorded as
a known hazard.

---

## Terms that look like typos but are not

| Looks wrong | Is | Why |
|---|---|---|
| `companai` and `compai` | two different folders | both real; paths depend on both |
| `corprorate.com` | the owner's domain | **deliberate and confirmed. Do not "fix" it.** |
| `15b`, `21c`, `24b` | item numbers | not a sequence — they grew by insertion. A gap does not mean something is missing |
| An empty admin dashboard | deliberate | its widgets read business areas that are switched off |
