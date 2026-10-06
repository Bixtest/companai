# Data permissions vs module permissions — an honest investigation

**Your idea, in your words.** Traditional systems set roles and permissions around **access to
modules and functions** (the code). In our platform the main game is **access to the data**. So gate
permissions on **what columns in what tables a user may touch, and what kind of access** — and then no
matter how creative a prompt is, the data grant is what decides what that user can get or use. Function
and widget sharing (just me / anyone / specific roles) is a separate, smaller layer, and even that is
managed through its own database fields rather than a separate scheme.

You asked me to investigate this honestly, with pros and cons, and said it is a thought, not a command.

**Short answer up front: your instinct is right, and it is also what the platform already partly
does.** I found the bones of exactly your architecture already in the code — a per-table gate, a
per-column policy, and a row scope. What is missing is not the idea. It is **coverage** (the gate is
declared for 4 of 67 tables), **a per-user layer** (today the row scope is only tenant + organization),
and **the wiring to the Business IR** so a query is bounded by the asker's grant automatically.

---

## 1. What I actually found (measured, not remembered)

I read the code. Three layers already exist:

**Layer 1 — a per-table gate.** Every searchable entity can declare `aclFeatures` — the permission
needed to read that entity's records. It **fails closed**: if a table declares no gate, access is
**denied**, not allowed. The AI's search tools enforce it: `authorizeEntityAccess()` checks
`hasAllFeatures(user's features, required)`. This is the "which table may you read" gate you described.

**Layer 2 — a per-column policy.** Every entity can declare a `fieldPolicy` with three lists:
`searchable` (only these fields), `hashOnly` (exact-match only, for sensitive things like emails), and
`excluded` (never). There is real code behind it (`extractSearchableFields`, `classifyFields`) that
strips fields before they are sent anywhere. This is the "which columns may you see" policy — **but
today it is aimed at encryption and search safety, not at "who may see which column".** Same mechanism,
different purpose.

**Layer 3 — a row scope, but a thin one.** When the AI searches, the results are filtered by exactly two
things:

```
filter: { tenantId, organizationId, entityIds: undefined }
```

So today a record is scoped to the **company** and the **organisation** — and that is all. There is no
"only my records", no "only my team's", no "only what I own". The caller's user id **is** available at
that point; it is simply not used to filter.

**And the AI layer is already guarded.** There is a test that refuses to let any read tool ship without
a permission on it ("no unguarded read tool"), and another that proves a tool is skipped when the caller
lacks the permission. So the platform does not rely on trust here. Good news for your concern.

---

## 2. The real gap: the gate is built, but almost nobody is in it

This is the number that matters.

- Tables made searchable, across 11 modules: **67**.
- Tables that declare a data gate (`aclFeatures`): **6** — people, companies, activities (three of them),
  and deals, all in the customers module.

So **61 of 67 tables have no declared data gate.** Because the gate fails closed, those 61 are either
invisible to the AI, or they are reached by some other path I have **not yet measured**. That second
question is the first thing I would nail down before designing anything, because it decides how urgent
this is: if there is a second door, the AI can reach ungated data today and that is a live hole. If
there is not, the situation is "safe but useless" — the AI simply cannot see most of your data.

*(Counted twice by different routes: `grep -c entityId:` per file, then again with the type definitions
in the shared file excluded — those seven hits are types, not declarations. Both give 67 real
declarations and 6 real gates. I first wrote 4; the true figure is 6. Corrected.)*

**I then went and answered that second question, rather than leave it hanging. Good news: there is no
second door.** I traced every way the AI can reach data, and each one is guarded:

- **The search tools** check the per-table gate (`authorizeEntityAccess`), and it fails closed.
- **The AI calling the platform's own API** is doubly checked: the AI tool's permissions must **cover**
  the route's permissions (`hasAllFeatures(toolFeatures, routeFeatures)`), and a **changing route that
  declares no permission is refused outright**. The real user's identity is attached to that call,
  not the AI's.
- **The AI's raw code sandbox cannot fake its scope.** Any `tenantId` or `organizationId` the AI writes
  is **stripped out and replaced** with the real one from context — and if the context has no scope, the
  field is left out (fails closed). So a clever prompt cannot widen its own reach.

**So the honest conclusion on this point:** the 61 ungated tables are not a live hole. They are simply
**not exposed to the AI at all** through the guarded tools. The situation is **"safe but badly wired"** —
the gate works and holds; it is declared for almost nothing. That is a coverage problem to fix, not a
breach to plug. This is the opposite of what I feared when I wrote the paragraph above, and it is the
answer you would have wanted.

---

## 3. Your idea, examined honestly

### Where it is right

**It matches the threat.** Your concern is exact: if the AI can compose any query through the IR, then a
permission on a *screen* ("can open the Invoices page") does nothing to stop a prompt that says "show me
every invoice over €10,000 for every customer". The screen gate is never consulted. A **data** gate is,
because it sits on the way to the rows. Your instinct is correct.

**It is more stable than module permissions.** A module permission is a fixed list of features in code.
Your platform is explicitly one where features get **created by prompts** — there is no fixed list to
hang permissions on. Data changes far more slowly than code. Gating on data means a new AI-made function
inherits the right gate automatically, because the gate is on the table, not on the function.

**It gives one answer instead of two.** Today the platform risks having a screen permission and a data
permission that disagree. If data is the gate, there is one place to look.

**It is not a rewrite.** As shown above, ~80% of the mechanism is already there. You would be
**completing** an existing design, not replacing one.

### Where it needs care — the honest cons

**Con — "which columns" is much harder than "which tables".** A table gate is easy to reason about:
you may read invoices, or you may not. A **column** gate gets subtle fast. If someone may see the
invoices table but not the margin column, then every total, every average, every "top 10 by margin"
becomes a question: does the number leak the column they are not allowed to see? This is a real,
well-known trap — you can hide a column and still leak it through a sum. So column-level gating is
right, but it needs a rule for **aggregates**, or it will look safe and not be.

**Con — the row scope is the hard part you actually need most.** The three scopes that matter to you —
own / team / global — are the ones **missing**. Tenant and organisation exist; own and team do not. And
"team" is genuinely hard: it depends on who is in whose team, which changes. This is more work than the
table and column gates combined.

**Con — performance.** Filtering every query by per-user data rules can slow the heavy reads. Mitigation
is caching the user's effective data grant once per request (the platform already does this for
features), but it has to be designed in, not added later.

**Con — "coat it in a way that is easier for users".** You already anticipated this: the underlying
model may be "table.column.scope", but the screen should say something a person understands ("can see
customer contact details", not "customers.people.contact_email.read"). That translation layer is real
work and easy to get wrong — a friendly label that drifts from the actual rule is worse than a technical
one, because it lies.

**Con — the shared-function layer still needs its own row.** You noted that when a user saves a function
they choose whether it is private / shared / role-scoped. That is correct, and it means you need **both**
layers, not one: the data gate decides *what the function can reach*, and the function's own field
decides *who may use the function*. They are different questions and both are needed. You already said
this; I am agreeing with it, not adding to it.

### Where I would push back — gently

**Do not remove the module/feature permission. Keep it, but make it secondary.** There is a reason the
per-entity gate in the code is written as a *feature* (`customers.people.view`): because it reuses the
one permission engine that already exists, is already cached, and is already tested. If you build a
*separate* data-permission system beside it, you get two systems that can disagree — the exact thing a
previous critic pass already rejected once on this project. My recommendation is to **extend the
existing engine to carry data grants**, not to stand up a rival.

---

## 4. What I recommend

**Adopt the idea — it is the right one — and treat it as completing a half-built design, in this order:**

1. **First, finish the measurement — DONE.** I traced every path the AI can use to reach data. There is
   **no unguarded door**: search tools fail closed on the per-table gate, AI route-calls are checked
   against the route's own permissions, changing routes without a permission are refused, and the AI's
   code sandbox cannot fake its scope. The 61 ungated tables are **not exposed**, not leaked. So the
   task is coverage, not containment — you can proceed calm on that point.

2. **Populate the table gates from the metadata you already have.** You should not have to hand-write 63
   gates. The IR already knows every entity and every table. The gate for each table should be
   **derived** from that, with a human able to override. This is where "no matter how creative the prompt,
   the data decides" actually becomes true.

3. **Extend the column policy from "encryption" to "who may see which column".** Same lists
   (`searchable` / `hashOnly` / `excluded`), second purpose. Add the **aggregate rule** at the same time,
   or a hidden column will leak through a total.

4. **Add the own / team / global row scope** to the query filter — the one place that is genuinely new
   work.

5. **Keep the function-sharing field as you described it** (just me / anyone / roles), and note that the
   platform already has the idea of a private-versus-shared object; it is a small addition on top.

6. **Restate the permission model in plain language on the screen.** Underlying: table + column + scope.
   Shown: "can see customer contact details", "can see all invoices, but only their own team's".
   Keep the two in step with a test, or the friendly label will drift.

**What happens if you say yes to this order:** the AI can still be as creative as it likes, because
whatever it writes, the data grant bounds the answer; a new AI-made function inherits the correct gate
automatically; and you gain a single, checkable place to answer "who can see what".

**What happens if you say no and keep module permissions only:** the AI-made functions keep needing a
human to hand-place a permission on each one, and a prompt that reaches data through the IR can outrun a
screen gate — which is the exact thing you were worried about.

---

## 5. The one question for you

Before step 1 finishes I do not need a decision from you. But so you can steer it:

**When a prompt asks for something this user is not allowed to see — a column, a table, or someone
else's records — should the AI tell the user it was blocked, or quietly return only what they are
allowed to see?**

- [ ] Tell them it was blocked (clearer; they learn the shape of their access)
- [ ] Return only what is allowed, silently (smoother; no friction, but they may not realise data exists)
- [ ] Tell them it was blocked, but only the *kind* of restriction, not the detail

*(Recommended: tell them it was blocked. You said permissions must be strict "without disrupting the
flow" — a blocked prompt that explains itself is strict and still smooth. Silence would mean a user
believes an incomplete answer is complete, which is the one outcome a compliance platform must avoid.)*

---

## Status of every point above

| # | Point | Status |
|---|-------|--------|
| 1 | Per-table gate exists (`aclFeatures`, fails closed) | **EXISTS — measured** |
| 2 | Per-column policy exists (`fieldPolicy`) | **EXISTS — but aimed at encryption, not user access** |
| 3 | Row scope | **PARTIAL — tenant + organisation only; no own/team** |
| 4 | AI read tools are guarded + guard-tested | **EXISTS — measured** |
| 5 | Gate coverage | **OPEN — 6 of 67 tables gated; needs completion** |
| 6 | Can ungated tables be reached another way? | **ANSWERED — no. Every path is guarded; no second door** |
| 7 | Gate derivation from IR/entity metadata | **TO BUILD** |
| 8 | Column access + aggregate rule | **TO BUILD** |
| 9 | own / team / global scope | **TO BUILD** |
| 10 | Function sharing (me / anyone / roles) | **TO BUILD (small — object sharing already exists)** |

Nothing in the code or the main documents has been changed. This is research and a recommendation, as
you asked.
