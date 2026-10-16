# System Manual & Requirements Specification

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**For:** anyone who wants to know what this platform is supposed to do, in the language of a *user* rather
than a developer.

> **How to read this.** Nothing here requires technical knowledge. Every term is explained the first time
> it appears, and the full list is in [`03-GLOSSARY.md`](03-GLOSSARY.md). Where a capability does **not**
> exist yet, this manual says so plainly and marks it **NOT BUILT** — a manual that describes the product
> as finished when it is not is worse than no manual.
>
> **Status legend:** ✅ **built and proven** · 🟡 **partly built** · ☐ **not built** · 📐 **designed, waiting to
> be built**

---

# Part 0 — The system in one page

Companai is a place where a company describes what it needs in ordinary words, and the platform turns that
description into real working software — then runs that software **without the AI**.

A person asks for something. The platform understands it, checks it against a single, precise description
of the business, runs it, and shows the result. Then the person chooses one of three endings: **answer me
once**, **change the structure of my business data** (which always needs a person's approval), or **save
this as a permanent capability** that from then on runs like an ordinary button — fast, free, and with no
AI involved.

Underneath all of that sits one system that decides whether any person or any AI may take any action, and
can always explain why. That system is the floor the product stands on.

---

# Part 1 — The world the system holds

## 1.1 The things in the system

| Thing | What it means |
|---|---|
| **Tenant** | One company using the platform. A hard wall separates one tenant's data from another's. |
| **Organisation** | A unit inside a tenant — a branch, a department, a subsidiary. Organisations can be arranged in a structure, and authority is inherited down that structure. |
| **User** | A person with an account. |
| **Role** | A named bundle of permissions, given to users. "Finance Viewer", "Approver", "Administrator". |
| **Agent** | An AI worker. It is a real object in the system — owned by someone, acting as someone, with a role — not a side file. ✅ |
| **Capability** | One specific thing that can be done, with a declared risk level and a declared reversibility. |
| **Entity** | A kind of business thing: a customer, an invoice, a vehicle, a visit. |
| **Field** | One piece of information on an entity: a name, an amount, a date. |
| **Relationship** | A declared link between two entities — "this invoice belongs to that customer" — with a declared direction, cardinality and behaviour when the other end goes away. |
| **Function** | A saved, reusable business operation that runs with no AI. |
| **Widget** | A saved, reusable *interaction* — something that shows data and lets a person act on it. |
| **Workspace** | A place where a person arranges widgets and works with the AI. |
| **Thread** | One conversation-with-work inside a workspace. |

## 1.2 The rules about those things (the ones a user should know)

- **One tenant's data never touches another's.** Every row belongs to a tenant, and the platform adds that
  filter itself on every read and write. The user never sets it and cannot override it.
- **Every record has an owner and a history.** Nothing is anonymous.
- **Nothing important exists only as an undocumented setting.** Anything that grants, bounds or records
  authority is *never edited in place* — it is replaced by a new version, so the platform can always
  reconstruct what the rules were at the moment something happened.
- **There is no separate "admin app".** All functions live on the same pages. Whether you can open a page
  or press a button is decided by the rules, not by being sent to a different application. A manager and
  an AI worker look at the same surface; the difference between them is a gate, not a different program.

---

# Part 2 — Getting in, and getting around

## 2.1 Accounts and signing in

✅ **Built.** You can create a user, sign in, reset a forgotten password, and hold a session that knows
who you are.

- Sign in at `/backend` (or be sent there from `/login`).
- Long-lived keys for programs to act on your behalf can be created, and a machine identity can be marked
  as an **AI user** — which is what makes an AI worker a distinct kind of actor rather than a disguised
  person. 🟡
- Sessions the platform cannot resolve (for example, the database is briefly unreachable) return a
  "try again in a moment" answer rather than throwing everyone out.

**A rule worth knowing:** the sign-in form accepts an ordinary web form, not a raw data packet. Sending
the wrong shape always produces a friendly refusal rather than a silent failure.

## 2.2 The home screen (the dashboard)

🟡 **Built but deliberately mostly empty.** The admin start page shows widgets. Ten of the base platform's
built-in widgets all read sales, customer and deal data — and those business areas are currently switched
off — so the platform turns those widgets off rather than showing ten broken panels. The empty screen says
so honestly instead of pretending.

This is not a defect. It is a consequence of a deliberate decision: **the business areas are parked, not
deleted** (see §11.3).

## 2.3 Finding your way around

The left-hand menu is built out of small, declared pieces that modules contribute to. ✅

- A section appears because something contributed items to it; a group appears when the first item in it
  does.
- What you see is filtered by what you are allowed to do, at the moment the page is drawn.
- A searchable list of saved views (called **perspectives**) lets you keep column choices, filters and
  sorting. ✅

---

# Part 3 — The workspace: asking for something

This is the part the owner calls *"the actual product"*, because the quality of the product is judged on it.
The design is written; the screens are being built.

## 3.1 The six moments

Every request you make passes through the same six moments, always in the same order, and you can always
tell which one you are in. The platform never jumps from your question straight to an answer with no
visible work.

| # | Moment | What you see | Status |
|---|---|---|---|
| **1** | **You ask** | One place to type what you want in ordinary words, with small reminders of *what you are asking about* — the thread you are in, the record you have selected. | 📐 |
| **2** | **It takes shape** | Your request turning into a **business operation**, not a chat reply. Shown as a short list in business words: *"which customers → in the North region → with overdue invoices → totalled by month"*. | 🟡 built, needs wiring to a screen |
| **3** | **The gate** | If what you asked for needs a shape the system cannot express, you get a plain statement — *"this needs a new field; here is the proposal"* — and your request becomes a **change proposal**, not an answer. | 📐 |
| **4** | **It runs** | The operation actually working against the real data, shown as plain lines — *"read the requested data (12 ms)"*, *"grouped by month (3 ms)"*, *"returned 47 rows"*. Not a spinner: the actual steps. | 🟡 built, needs wiring |
| **5** | **The result** | Your answer, in the right shape for what it is — a grid, a number, a chart, a form — with the operation that produced it stated in words. | 🟡 the object model is built; the screen is not |
| **6** | **The ending** | The three-way choice: **answer once** · **save as a Function** · (if moment 3 fired) **review the proposal**. Nothing is saved unless you say so. | 📐 |

### The display rules the six moments follow

- **Nothing goes dark.** Every moment has a visible state. There is no blank panel and no unexplained
  pause. If the platform is waiting on the model, it says so; if it is waiting on *you*, it says so.
- **You never see an internal identifier.** No raw codes, no technical names, no query language. You see
  business names — *"ACME Ltd"*, not an internal reference.
- **What needs you rises; routine work recedes.** A read is quiet. A gate, an ambiguity, a failure, or a
  refusal is loud. The one thing you must never miss is the thing that needs you.
- **Two views of the same thing.** By default you see the operation in your own words. One click away is
  an "inspect" view showing which tables and columns will be read — still in business terms, never a query.
- **There is no query language to show.** This is worth knowing: the system deliberately never produces
  database query text at that layer, so the inspect view shows the *meaning* and the *mapping*, which is
  the honest representation of what will run.

## 3.2 What you can do while you wait

The design borrows one idea from a reference system and makes it our own: **the absence of news is itself
news.** If a step is slow, the step shows as in progress. If nothing is happening, the screen says
*waiting for you*.

## 3.3 The companion chat

A working chat surface already exists and is mounted in the running app — you can dock it, use a command
palette, see tool calls being made and confirm them. ✅ The plan is to **extend that**, not to build a
second one.

The chat today talks to the agent runtime. It does not yet turn a prompt into a checked business
operation. That joining-up is exactly the current work.

---

# Part 4 — The three endings

Every request ends in exactly one of three ways. **The platform proposes which one; you confirm the ones
that matter.** You are never asked to choose from a menu of technical options, and the platform is never
allowed to change your database on its own initiative.

## 4.1 Ending one — a one-time answer

**You asked a question; you get an answer; nothing is saved.**

- The answer is the deliverable.
- Nothing is written to any permanent place.
- A quiet *"save this as a Function"* stays available in case you realise you will want it again.
- The conversation may keep a record of the answer, but it is **visibly not a Function**: no name, no
  permissions row, no menu entry. If it looked like a Function, this ending would quietly collapse into
  the third one, and the distinction would be lost.

## 4.2 Ending two — a change to the structure of your data

**You asked for something the platform cannot express with what it has.** For example: *"add vehicle
maintenance tracking"*, or *"give me an LMS"*.

This is the dangerous ending, and it is fenced:

1. The platform proposes the change as a **difference you can read** — *"+1 field"*, *"+1 entity"* — with
   the impact stated.
2. It goes through the same careful path as any other structural change: **check it → work out what it
   affects → get approval → apply it**.
3. **Nothing happens without a person's approval.** The AI can propose; it can never perform.
4. Changes are ranked by how dangerous they are, and the ranking decides who must look:

| Tier | Examples | What happens |
|---|---|---|
| **Safe** | a new optional field · a new read-only view · a new alias · a new way of breaking down a number | may proceed on its own once its tests pass |
| **Review required** | a new relationship · a change to how a number is calculated · a change to permissions · a change to a workflow | a person must review before it takes effect |
| **Explicit approval** | deleting data · removing a field · breaking a relationship · changing the meaning of a financial number · changing who is allowed to see what | a specific approval is required, every time |

**The owner's ruling, which is a good one:** adding a whole new service (an LMS, a CRM) always lands in
the strictest tier. *"Add me an LMS"* stops and names a person, every single time.

**Before a structural change is applied, the platform asks the permissions question first.** Not
*"is this a good idea?"* but *"does the person asking have the right to change the shape of this
company's data?"* If yes, the request goes into a pool where people with that right can pick it up,
validate it, build it, and tell the requester it is ready. If no, the platform explains what would be
needed. 📐

## 4.3 Ending three — saving a Function

**You asked for something, it worked, and you will want it again.**

The chain is: **your words → a typed business request → a result → "save as a Function" → a permanent
capability that runs with no AI.**

### What exactly gets saved

The **validated operation** — the typed request, its parameters, and the versions of everything it was
built against. Explicitly **not** the raw database query (there isn't one), **not** your original
wording, and **not** the data that came back. That is what lets a saved Function survive a change to the
database underneath it.

### What you are asked for when you save

- **A name**, in your own words. You may call it *"Overdue German Customers"* even if its internal
  address is something entirely different. Renaming never invalidates it.
- **A destination**, chosen from a proper list rather than typed freely. This matters: a menu two people
  can spell two ways is not a menu.
- **Parameters** — the values someone should be able to change when they run it later.
- **Permissions** — who may run it.

### The bar for saving

**Flawless means machine-checked, not "it looked right once."** Before the save is offered, the platform
runs an objective set of checks: is the request valid, do the entities and fields exist, do the
relationships hold up, is the parameter set sound, is the plan buildable. The save option is **not
offered** — with the failing check named — until those pass.

One honest limitation, shown rather than hidden: **permissions are not yet part of that check**, because
the layer that would answer "may this person read this row" does not exist yet. A saved Function is
therefore structurally verified and explicitly marked *"permissions not checked"*. 📐

### What happens afterwards

- It runs **with no AI**. Not "usually without AI" — the thing that runs it has no way to call a model at
  all.
- It goes through a proper life: **draft → generated → validated → verified → published → active →
  deprecated → archived**. You cannot skip a step, and you cannot mark it verified without a passing
  report.
- If the business model underneath it changes, it is re-checked. Adding an unrelated field keeps it
  working. Removing something it depends on refuses it, and names what went missing.
- It belongs to the tenant it was created in. Moving it to another company is impossible by design, not
  by policy.

### Where it appears

A saved Function becomes a **menu item** in the place you chose. The rule is simple and business-blind:
**the group a Function belongs to is its address minus its last part.** So an address of
`team.reports.overdue` puts the item *"Overdue"* inside a group called *"Reports"*.

If no such group exists, **one is created** — you do not need a developer or a module to exist first. A
second Function at `team.reports.followups` lands in the same group automatically.

Two further rules about menus:
- **A menu group is a filing cabinet, not a permission.** Being inside a group never grants anyone the
  right to run anything.
- **One Function may appear in several menu homes**, but it carries **the same permissions everywhere**.
- **Categories are flat for now.** Nesting can be switched on later without re-saving anything.

### A recipe may open as a page, as a panel, or as both — your choice, per recipe.

📐 **Not built:** the saved Function has no permanent record in the database yet. That means it cannot be
listed by ID, has no delete path, and cannot be shared by link. This is a known, named gap, deliberately
waiting on the reference layer that will give it an address.

---

# Part 5 — Widgets and workspaces

## 5.1 A Widget is an interaction, not a container of data

A Function *does* something. A Widget *shows and lets you act*. A Widget holds no data of its own: it
points at a Function or at a kind of business thing, and it declares its inputs, its outputs, what
happens when you press something, what it depends on, and what permissions it needs.

Because a Widget's description has **no place to put a piece of code, a style, or a query**, adding a
Widget can never secretly add a new way to reach data. It can only re-present what a Function or an entity
already governs — under that Function's permissions.

Two kinds of input exist, and only these two must actually appear as something you can fill in: something
**you type or choose**, and something **passed in from the Function's parameters**.

A published Function placed into a Widget runs from that Widget's own inputs with no AI. ✅

## 5.2 The dashboard and the workspace

- **The dashboard** is your landing surface: the things you saved, what needs your attention, and the way
  into a workspace.
- **A workspace** is where you work: your threads, your widgets, and the AI.

📐 The workspace screen does not exist yet. The design for it is written and is the next major design
batch.

## 5.3 Three levels of working together

1. **Across a whole workspace** — everything in it is shared with whoever you share it with.
2. **Around one Widget** — a comment attached to a specific panel.
3. **On one specific object** — a comment anchored to a particular row, cell, chart point, form field or
   paragraph.

At every level, the same rule applies: **sharing a Widget does not automatically share the data behind
it.** The platform checks what each viewer may see, every time, for every view.

---

# Part 6 — Threads and working together

## 6.1 A thread is a place, not a record of decisions

✅ **Largely built.** You can start a thread, it is saved, it has an owner and a title, it belongs to your
tenant and organisation, you can list your threads and reopen them, and its content survives a page
reload (not just plain text — the rich cards it showed).

A thread may hold messages, notes, layout, annotations and comments. **It may never be the authority for
a business record.** If work needs doing, a thread starts it by calling a **Function** (which is checked
by the Function's own permissions) or a **business command** (the platform's checked write path). The
thread contributes the *intent and the discussion*; it never contributes the *state*.

## 6.2 Sharing a thread with people

✅ **Built.** You can share a thread with other people. Each person gets one of three roles:

| Role | What they can do |
|---|---|
| **Owner** | Everything, including sharing and closing. |
| **Viewer** | See it. |
| **Commenter** | See it and add comments. |

When you share with the first person the thread becomes "shared"; when the last person besides you is
removed it becomes private again automatically. The same person cannot be given two conflicting roles.

## 6.3 Working with the AI in the same thread

🟡 **Half built.** The human half works. The gap: today the AI is *the agent the thread was opened with*,
a property of the thread — not a **participant** sitting alongside you in a list.

So a thread can have one agent and many people, but the two live on different axes. Making the AI a peer
in the participant list is designed and waiting on one owner decision. 📐

## 6.4 Presence, and what it does not mean

📐 **Not built, and deliberately later.** Who is *watching* must never imply who may *act*. Presence is a
courtesy feature, not an authorisation feature.

## 6.5 Activity is not audit

Two different records exist and must not be confused:

- **The thread's messages** are the friendly history of a conversation — what people said, what the AI
  proposed.
- **The audit trail** is the platform's tamper-evident record of what was actually *done*.

A message saying *"I think we should cancel that invoice"* is not an audit record of anything.

---

# Part 7 — The rules about who may do what

This is the part that does not exist anywhere else in this form, and it is what makes the platform safe to
hand an AI. It is largely built.

## 7.1 Roles and permissions

✅ You can define roles, give them permissions, and the platform enforces every one of them on every
write — not merely by hiding a button.

- A role holds a list of permissions. A wildcard grant can cover a whole area.
- Permissions are read back and enforced centrally on every request.
- Every capability a module offers declares what it *is*: what kind of effect it has, whether it can be
  undone, and what class of data it touches.

## 7.2 The one decision point

✅ There is exactly **one** place that decides whether an act may proceed, and everything else asks it.
A second opinion-somewhere-else is treated as a bug.

It never answers yes or no. It answers with a **level and the reasons**, so every answer can be rendered
as one plain sentence naming the rules that produced it.

### The levels of autonomy

| Level | Plain meaning |
|---|---|
| **Blocked** | No. |
| **Propose** | You may suggest it; you may not do it. |
| **Approve first** | It may happen only after a person says yes. |
| **Hold and commit** | It goes ahead by itself after a waiting period, unless somebody stops it. |
| **Execute and review** | It happens; somebody is expected to look at it afterwards. |
| **Execute and log** | It happens and is recorded. |

### How the level is worked out

The system starts from what you were granted and then **lowers** the level for every rule that applies.
The answer is always the **lowest** one. Nothing anywhere in the system can raise it.

The things that lower it include: how dangerous the action is; whether it can be undone; how sensitive the
data is; how much the actor has earned the system's trust; who asked them to do it; where they sit in the
organisation structure; whether someone delegated to them, and with what limit; whether the record is
frozen; and the company's own policy.

**A machine with no track record does not get the benefit of the doubt.** For an AI with no trust record
yet, reading is allowed freely and *everything else* requires approval first.

**Humans have levels too.** A junior may need approval for the same action an AI worker needs approval
for. Needing approval is a property of authority, not of being a machine.

## 7.3 Trust is earned, and lost automatically

✅ You can see what an AI worker has earned, and grant more. **Promotion is slow, needs evidence, and
needs a person. Demotion is automatic and immediate.**

## 7.4 Saying no explicitly (denials)

✅ A permission can be withheld explicitly — and it applies **even to the most senior administrator**.
This is the out-of-band lever for when something has gone badly wrong.

## 7.5 Lending authority without giving it away

✅ You can lend someone part of your authority for a period or a purpose. Both ends are real people or
real agents. **Authority travels down and never grows:** nobody can cause an act the lender could not have
performed themselves.

## 7.6 Freezing a record

✅ A specific record can be restricted or locked. A locked record cannot be written by anyone or anything;
a restricted one needs approval first. **Reads are deliberately exempt** — a record nobody may read is a
record nobody can examine before deciding to unlock it. If the system cannot tell what state a record is
in, it treats it as locked.

## 7.7 The approvals queue — the screen that makes all of this usable

✅ **Settings → Authority → Approvals.** This is the flagship screen of the whole system.

It shows **two lists on one page**, and they never share a row, a button or a colour:

- **Waiting** — the act has *not happened yet*. Approving it **runs** it. Rejecting kills it. Ignoring it
  lets it expire, or lets its waiting period run it.
- **To review** — the act *has already happened*. The only question is whether anybody looked.

Each row explains itself in plain words, translated from the level:

- *"The proposer may not perform this — you would be performing it."*
- *"Needs your approval before it runs."*
- *"Runs by itself when the waiting period passes, unless you stop it."*
- *"Already happened. Someone should look at it."*

Approving and rejecting are both recorded, because **an approval is itself an act**.

**How the queue is sorted is your own taste, not a policy** — it is remembered for you, not imposed.

📐 **Not yet built:** approving many things at once *with the difference between them shown*. Approving
in bulk without seeing what differs is rubber-stamping, which is the exact thing the queue exists to
prevent. Also not built: cover for an approver who is away, and standing approvals.

## 7.8 Turning enforcement on

The system ships in **shadow mode**: every decision is worked out and written to a log, but nothing is
refused. That is a measurement, not a policy. The operator is expected to **read their own shadow report
before switching to enforcing** — which is why the switch is a deliberate command-line action and not a
casual toggle in a settings screen. 🟡

**An honest boundary:** once enforcing is on, refusals are real. Some obligations are not yet enforced —
an act that should wait for a person waits, but there is not yet a general way to freeze *any* act
half-done and resume it later.

## 7.9 Asking "why?" and getting an answer

✅ You can ask the platform to explain a decision for a capability and an actor, and it will print every
rule it considered, mark the one that decided the answer, list what you would owe if you went ahead
(approval, a waiting period, evidence, a second person), and say **what would change the answer**.

---

# Part 8 — Data protection

## 8.1 Marking sensitive fields

✅ Fields across many modules are marked as sensitive. They are stored encrypted, decrypted only for
someone allowed to read them, and there is a screen for managing the marking.

## 8.2 Never exported by accident

✅ Every route that exports real records now checks the marking and **masks a marked field** — on the
server side, from a client-side view export, and from the customer-facing task list. If a future export
route is added without that check, a test fails the build.

## 8.3 Marked fields are hidden from the AI too

✅ When the AI reads data, it goes through the same masking as a person's export — recursing into nested
values, and refusing to aggregate on a marked field. 🟡

## 8.4 One honest gap

☐ The layer that would answer *"may **this** person read **this row**, for this purpose?"* does not exist.
Today the platform answers *"may this person read **this kind of thing**?"* It is a named gap and several
other things wait on it — including the "permissions not checked" note on saved Functions and the marker
that says an answer was reduced before you saw it.

---

# Part 9 — Audit and provenance

✅ **Built.** This was almost missed, because the project's own register recorded it as *"never checked"* —
which turned out to mean *"nobody looked"*, not *"absent"*.

You can see **who did what, when, and on which record**, filter by person or by record, and **export it
as a spreadsheet-friendly file** for an auditor.

### The tamper-evident record

Every significant act is appended to a **chain**: each entry carries a fingerprint of the one before it.
You cannot alter one entry without breaking the chain from that point on, and there is a command that
verifies the whole chain for a tenant.

**Honest bound:** the everyday journal is *mutable by design* — some maintenance tools update derived
columns in it. The tamper-evidence is the **chain**, not the journal. And one specific case bypasses the
chain today: the record of an *undo* is written straight into the journal without being chained. That is a
known, named gap — and it is precisely the record somebody hiding their tracks would want to be the one
that is not covered. ☐

**Retention:** the high-volume access log is trimmed on a schedule. The chain itself is **never** trimmed,
by design — pruning it would break the guarantee. ☐ The everyday journal has no trimming rule yet, which
is a policy decision for the owner.

---

# Part 10 — Adding tools and capabilities over time

The platform is meant to grow after it ships, without being rebuilt. There are **three routes**, and they
differ in who may use them and how much they are trusted.

| | Route 1 — **we ship it** | Route 2 — **a user authors it** | Route 3 — **the AI proposes it** |
|---|---|---|---|
| **Who** | the platform's developers | a person using the product | the AI, acting as that person |
| **What they may add** | anything, including new kinds of code and new places to put things | **content only** — declared panels, saved Functions, menu placements | **proposals only** — a described change or a described Function |
| **Needs a redeploy?** | yes | no | no |
| **Can it ever run arbitrary code?** | yes (ours) | **never** | **never** |
| **How it is checked** | someone reviews the change before it ships; at run time it is gated by permissions | **on the way in** (may this person ask for this?) **and on the way back** (may each viewer see this result?); private to its author until someone opens it up | the same two checks, **plus** a preview with dummy or masked data, **plus** a person confirming |
| **Status** | ✅ built | 📐 designed, needs the permissions engine first | 🟡 the proposing half is built; validating, sandboxing and applying are new |

### Why the user route is safe by construction, not by promise

This is the part I found genuinely well designed, so it is worth stating carefully.

- **A widget a user authors has nowhere to put anything dangerous.** Its description has no slot for code,
  for a style, or for a query. It can only point at a Function or a kind of business thing — so it can
  only re-present what is already governed, under the permissions already in force.
- **The AI cannot exceed the person it is acting for.** Its output is modelled as a *candidate*, never as a
  saved capability, and the saved capability is already bound to its tenant.
- **Trust is a different question from authorship.** A widget written by a user is trusted less than one
  the platform ships, no matter how sensible it looks.
- **Wanting a brand-new kind of panel is a platform change**, and the correct response is to escalate it
  as one — not to find a way around it.

### The AI's write vocabulary

When the AI describes a change to a workspace, it uses a fixed set of thirteen operations — add a widget,
remove one, move one, resize one, change a parameter, set a selection, bind two things, unbind them, add a
reference, add a comment, create a task, and **propose a Function**. The AI **proposes**; the platform
**validates and applies**. That division is deliberate and is not to be blurred.

---

# Part 11 — Working the platform day to day

## 11.1 Settings

Settings live in one place, grouped into sections, and you only see the ones your permissions allow.
The Authority section holds the approvals queue, lending authority, withheld permissions, earned trust,
projects, and frozen records.

There is also a screen for the structural rules themselves: which kinds of structural change need which
level of scrutiny, per kind of object and per kind of actor. ✅

## 11.2 Things you can build yourself without a developer

- **New fields and new kinds of records** — declared, applied, and permission-gated. ✅
- **Saved Functions and menu entries.** 🟡
- **Saved views (perspectives), dashboards, workflows, business rules, feature flags, dictionaries,
  translations, scheduled jobs, webhooks, integrations, attachments, currencies, messages, an inbox for
  external email and chat.** ✅ all present as modules

## 11.3 The business areas that are switched off

Fourteen areas from the base platform are **parked**: customers, catalogue, sales, warehouse, shipping,
payments, customer portal, staff, resources, checkout, and a few sync and gateway integrations.

**Parked means switched off, not deleted.** A parked area creates no tables, serves no pages, and loads
no code — but the source stays readable and can be turned back on by removing one comment. This was a
deliberate decision so that the platform's foundation is finished **before** the business areas are
rested on it.

**The order they come back in matters**, and it is written down: sales needs catalogue, customers and
dictionaries first; the customer portal needs the customer-accounts area; and so on.

**Only one thing was ever deleted outright:** a package whose licence forbids redistributing it.

## 11.4 Where things live and how they are reached

- **Locally**, on the owner's machine, in eight containers, reached at `http://localhost:3000`.
- **Hosted**, at `companai.corprorate.com`.

## 11.5 Importing and exporting

Modules exist for importing and syncing external data, for webhooks in and out, and for a spread of
provider integrations. 🟡

---

# Part 12 — How the system must behave (the non-negotiable qualities)

These are requirements, not aspirations. Each is already binding on the build.

1. **Nothing acts without someone answerable for it.** Every consequential act names who did it, on whose
   behalf, and which grant of authority allowed it. There is no shared superuser identity and no
   unattributed background automation.
2. **Authority is only ever narrowed, never widened.** No path lets anyone cause an act the person who
   started it could not have performed themselves.
3. **Discovery never grants access.** Search, tags, indexes, summaries and previews may only narrow what
   you can already see. You cannot tag or search your way into data you were not given.
4. **Declared or it does not exist.** A capability that is not declared cannot be invoked. A route without
   a declared capability fails at startup, not at review. **A test that checks a rule nothing enforces is
   worse than no test**, because it manufactures confidence.
5. **Every control says what it actually does.** A setting that claims to protect something must say, in
   the place where you set it, whether that protection is enforced or advisory. **Overstating a control is
   as serious as a broken one**, because both produce misplaced confidence.
6. **Demotion is automatic; promotion is human.** Trust tightens by machine on evidence of harm, and
   loosens only by a person on evidence of competence.
7. **Reversibility is declared.** Every capability says whether its effects can be undone, compensated, or
   not undone at all. Something irreversible can never be left to a after-the-fact review.
8. **Language and reading direction are structural, not decoration.** Everything carries its language and
   whether it reads left-to-right or right-to-left. English, Swedish and Arabic are seeded from day one.
9. **It must not get more expensive as it grows.** The whole point of the loop.
10. **Every claim carries an observation.** The project's own working rule — and it has caught real
    defects that reading code alone had missed three separate times.

---

# Part 13 — What is not there yet

Stated plainly, because a manual that hides this is useless.

| # | What is missing | What it blocks | When it can start |
|---|---|---|---|
| 1 | The **workspace screen** — a place to arrange widgets and work in threads | the part you would actually look at | the design is written; the build follows the design |
| 2 | A **database record for a saved Function** | listing it by ID, deleting it, sharing it by link | when the reference layer gives it an address |
| 3 | The **data axis** — "may this person read this **row**?" | the permissions check on saved Functions; the marker that says an answer was reduced | it is a named foundation item |
| 4 | **The AI as a participant** in a thread | true human-and-AI collaboration | an owner decision |
| 5 | **Bulk approval with the difference shown** | working a large queue safely | startable now |
| 6 | **User-authored widgets** and **the full AI-propose path** | the platform growing after it ships | the permissions engine first |
| 7 | **The single front door** to the AI engine | swapping the engine out safely | in progress — the door's shape is written |
| 8 | **Finance and procurement** areas | a complete business vertical | after the foundation, by design |
| 9 | **Backup and restore of the business itself** | the safety net | startable |
| 10 | **Per-tenant model policy** (which model runs where) | the long-term model default | decided in principle; three pieces of work follow from it |
| 11 | **Dependency tracking and change propagation** | knowing what breaks when the model changes | designed, startable |
| 12 | **Guard coverage in the parked modules** | nothing today — they are switched off | recorded, not forgotten |

---

# Part 14 — The shape of the whole thing, in one picture

```
                     YOU, in ordinary words
                              │
                              ▼
                      ┌───────────────┐
                      │  THE WORKSPACE │   threads · widgets · the AI · menus
                      └───────┬───────┘
                              │
                              ▼
                    a typed BUSINESS REQUEST        ← the AI may produce this
                              │                       and nothing lower
                              ▼
                    ┌──────────────────┐
                    │  CHECKED, then   │             ← deterministic. No guessing.
                    │  RUN, safely     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        answer once    a change to the    saved as a FUNCTION
                       business model     ─────────────────────
                       (needs approval)   runs forever with NO AI
                                                │
                                                ▼
                                       becomes a WIDGET
                                       in a WORKSPACE
                                                │
                                                └──────────► and the loop starts again


   ┌─────────────────────────────────────────────────────────────────┐
   │  THE FLOOR UNDER ALL OF THE ABOVE                                │
   │  one decision point · every ceiling counted · the answer is      │
   │  always the lowest one · every answer explainable · everything   │
   │  recorded in a tamper-evident chain                              │
   └─────────────────────────────────────────────────────────────────┘
```

---

*End of the manual. For the same ideas in the project's own words, read
`library/WHAT-WE-ARE-BUILDING.md` and the design set in `library/workspace-architecture/`. For what is
being built this week, read the box at the top of `JOURNAL.md`.*
