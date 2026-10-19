# PLAN — the one agent: strategy, rulings, and the work

**Status:** OPEN — a written requirement and a work breakdown. **No code has been written for it.**
**Date:** 2026-10-18 · **Owner:** the strategy statement below · **Reviewers:** four, independent (see §8)
**Inputs:** the nine platform studies, `08-THE-SRS.md` (54 `SR-*`), `MASTER-CHECKLIST.md` (119 register
rows), and four measurements of our own code taken for this document (§2).

---

## 0. What was asked, and the one-sentence answer

The owner's statement, in his words:

> One agent, and its functionality differs based on the settings, so it ends up covering one or a
> combination of the types. **Aissistants** are AI agents hired by a user as assistants — one user may
> have one or many — and their authority is the intersection of the user's permissions and the
> assistant's. **Staiff** is an AI user that behaves like a normal platform user, with roles and
> permissions. All of it at platform level or by tenant. Achieve the ultimate agent — rich, versatile,
> adaptable, secure, integrable — then organically add it to platform core, adapting both sides; same
> method for workspaces, workspaces↔ai_agents, Automation, and widgets.

**The answer: the direction is right, the mechanism is one field away from a security defect, and the
order is wrong in one place.**

- **Right:** one agent core, one capability surface, one engine seam, one identity model. Four separate
  agent implementations would be four dialects, and the donors all agree on this.
- **One field away:** "type" must not be a *setting*. If a mutable field selects which permission rule
  applies, the system can be talked into granting the wrong thing by editing data. The type is a **name
  for three facts set once at hire** (§3), and every *setting* may only narrow what those facts allow.
- **Order wrong in one place:** the four surfaces are not peers. Workspaces do not exist as a module,
  Automation cannot wake durably, and Widgets sit behind both. Attaching all four now is four
  migrations wearing one plan. The spine lands first; **chat** — the one surface that already works —
  proves it; then the others attach one at a time.

**And the correction this document owes the record:** the two analyses written before it covered
Zulip, Multica, Buzz and Slack. Those answer *"what is a bot to a room"*. They do not answer *"what is
an agent"* — and the two donors that do are **Paperclip** (our ancestor: four separable layers, a
gated hire, finite runs) and **Hermes** (the engine: profile, soul, skills, memory, tools). Omitting
them was a scoping error, not a judgement. They are now the primary donors for W1, W2, W4 and W5.

---

## 1. The verdict, in six lines

| # | The strategy says | The verdict | Why |
|---|---|---|---|
| 1 | One agent core | **CONFIRMED** | Paperclip's four layers and Hermes's profile are the same conclusion from opposite directions. Four cores would be four permission dialects. |
| 2 | Types are settings | **CONFIRMED AS A BUNDLE — and the owner's framing is better than mine** | A type **is** a role for agents: a named, data-defined bundle of capabilities, so "standardised agents" become cheap to create (§3.1). The only thing a type must not do is **select the permission rule** — that is a different kind of field that happens to share the name. |
| 3 | Aissistant = intersection | **AMENDED, AND IT IS THE MOST IMPORTANT ONE** | Intersection of permission **lists** is unsound and can widen. It must be intersection of **decisions**, computed live, through one function (§3.3). |
| 4 | Staiff behaves like a normal user | **CONFIRMED; the ceiling is configuration, not code — and the floor is ANSWERED (2026-10-19)** | A machine *can* already resolve roles — from its key row (`rbacService.ts:320-355`). The owner's ruling: the platform admin sets the ceiling for machines and tenants inherit a subset (D1). **The floor is the five listed in §4.5, confirmed 2026-10-19** — capabilities that change the authority system itself, which no configuration may ever give a machine. |
| 5 | Platform level or tenant level | **RESOLVED — and my question was a misreading** | It was said of **types**, not agents. Types have **two layers** (shipped by the platform, or created by a tenant); agents are **always** inside a tenant, which is why all twelve agent tables require one. What the misreading surfaced is real: the type catalogue has only a **code** layer, so a tenant cannot create one (`CC-126`). |
| 6 | Same method for the four surfaces | **CONFIRMED, WITH AN ORDER** | The method is right; doing it concurrently is not. One spine, one proving surface, then attach (§6). |

**One precondition, and it is not optional:** a **human-only / machine-only route classification** does
not exist. Any API key holding `ai_assistant.view` reaches the assistant surface. Every new surface
built before that gate exists is machine-writable by default, and "Staiff behaves like a user" turns
that from a gap into a design.

---

## 2. What the code actually has — measured, not assumed

Rule 1 applies: docs are claims, code is the authority. Four measurements, all taken for this
document, plus three defects found while taking them.

### 2.1 The four load-bearing facts

**F1 — Agents are declared in code; nothing is hired.** `AiAgentDefinition`
(`lib/ai-agent-definition.ts`) is a code object: model, tools, loop controls, budgets,
`requiredFeatures`. It is loaded from a generated registry (`lib/agent-registry.ts`). The database holds
**overrides** (`AiAgentPromptOverride`, `AiAgentRuntimeOverride`, `AiAgentMutationPolicyOverride`,
`AiTenantModelAllowlist`), **bindings**, **runtimes** and **conversations** — twelve entities in
`data/entities.ts`, and **not one of them is an agent instance**. Consequence: `agentId` is
code-declared, so two tenants' assistants are *the same object*; "one user, many Aissistants" has no
row to live in.

**F2 — The narrowing already exists, and it is the right shape.** `AiAgentBinding`
(`data/entities.ts:1077`) carries `principal_id` (the `api_keys` id), `tool_allowlist` — *"a subset of
the agent's own `allowedTools` … the effective set is the INTERSECTION with the agent's declaration — a
binding can narrow, never widen (B3)"* — and `required_features`, which is a **UNION** with the
agent's declaration. So "the assistant's own permissions" and "the user's permissions" are already two
gates that compose, at the tool and feature level, for a binding. This is the strongest thing we have
and it should be the template for the rest.

**F3 — A machine already resolves roles, from its credential.** `rbacService.loadAcl`
(`:294-360`) parses the subject; for an API-key-backed kind (`service`, `ai_worker`) it loads the
**key row** and reads `roles_json` → `RoleAcl` features and `isSuperAdmin`. The comment is explicit:
*"Both service keys and AI workers resolve their permissions from the key row they authenticate
with."* So a Staiff's *authority resolution* is not missing. What is missing is everything that makes
it a *person*: a stable actor id, a name, a home, a lifecycle.

**F4 — Delegation exists, with a ceiling that narrows.** `AuthorityDelegation`
(`auth/data/entities.ts:728`) carries `capability_id`, `authority_ceiling` (*"at or below what they
hold themselves"*), a non-null `expires_at`, a non-null `reason`, and `revoked_at`;
`DelegationService.activeFor` is deliberately **never cached** (*"a revoke that takes effect 'within
five minutes' is not a revoke"*). The grant path already checks the grantor actually holds what they
lend (`CC-94`, built 2026-10-17). This is the mechanism an Aissistant's "acts for Priya" should use.

### 2.2 The three defects found while measuring

**X1 — The actor's authority hangs off its credential, so rotation un-hires it.**
`AiAgentBinding.principal_id` is the **`api_keys` id** (uuid, **no FK**). A machine's roles live on the
key row (`api_keys.roles_json`). Rotation is delete-and-create — there is no `rotate` in
`apiKeyService`. So rotating a key: loses the actor's roles, orphans its bindings (no FK to catch it),
dangles its delegations, and splits one agent's audit trail into N actors. **An assistant that cannot
outlive its own password is not a colleague.**

**X2 — A denial written the way the schema documents never applies.**
`AuthorityDenial.subject_principal_id` is `text`, and its own docblock says why: *"an API key acting is
`api_key:<id>`, and a `uuid` column would make machine actors undeniable"*. But
`DenialService.blocking` (`:110-121`) matches on the **bare** id that `parseSubject` returns, and the
route's schema is `z.string()` with no normalisation (`denials/route.ts:35`). So a denial stored as
`ai_worker:<uuid>` — the encoding the schema recommends — **is accepted, audited, and never matches**.
That is a ban that does not ban: **fail-open**. The same encoding mismatch makes a machine-grantee
delegation silently inert (fail-closed), and lets a self-delegation bypass the ceiling check at
`delegations/route.ts:186` by writing the prefixed form.

**X3 — "Intersection" as a list operation is unsound.** Our permission model is not a list. `*` is
everything; `module.*` is a family; `.own` is a *different capability*, not a modifier; a superadmin
short-circuits before features are read (`rbacService.ts:620-625`); a denial is **subtracted after** the
grant; a delegation is **added after** the grant has said no, and does not re-check the grantor at use
time. Intersecting the lists gives `['*'] ∩ ['users.view'] = ∅` — denying everything — while
`['x.own'] ∩ ['x.view']` can *widen* row scope by stripping the qualifier. **Intersect answers, never
lists.**

---

## 3. The model: bundles for what it may do, facts for how it is judged

### 3.1 A type is a role for agents — the owner's framing, and it is the right one

> *"Agent capabilities will be identified by what we select for this agent from the full capacity
> available for AI agents. Types are like roles for permissions in human users — some sort of bulk
> packaged capabilities that makes creating new AI agents with standardised capabilities possible."*
> — the owner, 2026-10-18

That is the model, and it maps onto machinery we already run, one level down:

| Human side | Agent side | Where it lives |
|---|---|---|
| a **permission** — one thing you may do | a **capability** — one thing the agent may do | code (`capabilities.ts` descriptors) |
| a **role** — a named bundle of permissions | a **type** — a named bundle of capabilities | **data**, the way `RoleAcl` is |
| a person's **assignment** to a role | **hiring** an agent from a type | data |
| a per-person extra grant or removal | a per-agent binding or ceiling | data |

Four levels, and each one is a **subset** of the level above it:

```
everything the platform can do
   └─ the platform's ceiling for machines        ← the platform admin sets this   (D1)
        └─ a TYPE — a named bundle               ← "Aissistant", "Staiff", "Analyst"
             └─ a hired INSTANCE                 ← tenant-scoped, per-user state
                  └─ a BINDING or DELEGATION     ← per person, per task
```

**Two layers of type, and only two.** A type is either **shipped by the platform** — part of the product,
visible to every tenant, versioned with the code — or **created by a tenant** for its own use, from the
same capability catalogue. That is exactly how roles already work: some roles ship with the system, some a
tenant defines. **An agent, by contrast, is always inside a tenant** — all twelve agent tables require a
tenant, and that is correct, because an agent is a thing that acts inside somebody's data.

**One consequence of the analogy that has to be built in, not discovered later.** A role is edited,
and the edit changes everybody who holds it. If the *Aissistant* type is edited tomorrow, does every
assistant already hired from it change? **It must not.** An instance **pins the type version it was
hired with**, and an upgrade is an explicit act (`CC-122`). Otherwise "standardised capabilities"
quietly becomes "re-standardised without asking".

**What a type must never be is a switch for *how* permission is calculated.** A role grants
permissions; it does not change the way the system checks them. Same rule here: a type **bundles
capabilities**, and it must not select the permission rule. Those are two different things that both
happen to be called "type", and only the first one is a bundle. The second is the badge problem:

> Imagine a company where every employee's badge is printed with a type — *assistant*, *contractor*,
> *employee* — and changing the word on the badge changes which doors open, and the person wearing it
> can edit the word. That is a `type` column that selects a permission rule. Nobody builds a building
> that way.

### 3.2 The three facts that are not a bundle

A bundle says **how much** an agent may do. It cannot say **where its authority comes from**, because
that is not a quantity — it is a different source. Three facts are fixed at hire and are not settings:

| Axis | The question | Values | Why it is not a setting |
|---|---|---|---|
| **A — Identity** | *What is it?* | a machine principal, with a credential and a stable actor id | Changing identity is a different actor, not a different mode. |
| **B — Standing** | *Where does its authority come from?* | **own** (roles/ACL — the Staiff) · **delegated** (a human lent it — the Aissistant) · **run-scoped** (the task carries it — the worker) | This *is* the permission algorithm. A field that selects it is the defect. |
| **C — Placement** | *Where does it live, and what is it attached to?* | platform **template** · **tenant** instance · **per-user state**; attached to a room, a task, a schedule, a record | Ownership and lifecycle, not capability. |

Everything else — the capability bundle, model, persona, skills, tools, memory, budget, autonomy
ceiling — is a **setting**, and **every setting may only narrow**. That invariant is what makes one
agent safe across all the types at once, and it is already the rule the code uses for bindings (F2).

### 3.3 The intersection, in plain words

*"Keep what both have"* only works if both sides are the same kind of thing. Ours are not.

- `*` means everything. `users.*` means a family. Intersecting them as strings gives **nothing**, so
  the assistant would be denied everything its owner can do.
- `.own` is a *separate capability*, not a suffix. Strip it and the intersection **widens** row scope.
- A superadmin never reads a feature list at all — the list is empty and the answer is still yes.
- A **denial** is subtracted *after* the grant is read. It is not an element of the list.
- A **delegation** is added *after* the grant says no, and it does not re-check the grantor at use time.

So the intersection must be of **answers, not lists**. One function, asked twice, at the same instant:

```
may(principal = the human,   capability, scope)  AND  may(principal = the assistant, capability, scope)
```

Both must be yes, from the same chokepoint, against the same clock. And the human's half must be read
**live** — not frozen at hire — or revoking Priya's permission never reaches Priya's assistant, and the
assistant becomes a way to keep using authority the person no longer has.

**Where this already exists, partially:** `invokerCeilingFor`
(`authorityEnforcementService.ts:488`) is the only real decision-intersection in the platform. It is
reached only through `decideFor` (`:270`); the **HTTP RBAC path is the one door that does not pass an
invoker** and so resolves the actor alone — its own comment calls that *"wider, not narrower"*
(`tool-authority.ts:100-102`) — and `refusalFor` returns `null` outright unless the tenant's mode is
`enforce` (`:233`), while `CC-11` records that `enforce` is armed for **no tenant**. So the mechanism is
built, proven, and reached by nobody on the path that matters — the `CC-101` shape this project keeps
finding. W3 is not "invent intersection"; it is **route every path through the one that exists**.

### 3.4 The type names, once the axes exist

The four names the owner used are then **lookups, not branches**:

| Name | A — Identity | B — Standing | C — Placement |
|---|---|---|---|
| **Aissistant** | machine | delegated from one human, live | per-user state under a tenant instance |
| **Staiff** | machine | **own** roles, capped (D1) | tenant instance |
| **Worker** | machine | run-scoped | tenant instance, attached to a schedule or task |
| **Colleague** | machine | delegated **or** own, per the room | tenant instance, attached to a room |

No `if (type === ...)` anywhere outside the resolver. If a module needs to branch on the type, the
axes are missing a value.

---

## 4. The rulings — three answered, one open

Per the standing protocol, no code before a written requirement. **The owner's principle, given
2026-10-18, settles most of this:**

> *"Can't we dictate such limitations across the platform by the platform superadmins (and tenants'
> admin capabilities to decide on that gets inherited by superadmin allowed settings)? Instead of
> hardcoding it."*

**Yes — and it is the better answer than what I asked for.** A hardcoded list in code is a list nobody
can adjust without a deploy; a **ceiling set by the platform admin and inherited downward, where a
tenant may only choose a subset**, is the same safety property with the control in the right hands. It
is also the shape the code already uses for roles and for bindings: *narrow, never widen*. So the
chain in §3.1 becomes the implementation, and the words "never granted" below mean *"not in the
platform ceiling, and no configuration may raise it"* — not *"hardcoded in TypeScript"*.

**One thing must still be a floor rather than a setting**, and it is the only part of D1 that survives:
**a machine may never hold the capabilities that change the authority system itself.** Not because we
distrust the admin, but because if a machine can grant itself authority then every other control in
the chain is decoration. Paperclip reaches the same conclusion by a different route (its default
permission set deliberately excludes `agents:create`, `users:manage_permissions`, `tools:admin`, and
anything that can rewrite its own execution). **The floor is small, and it is the answer to D1's
second half.**

### D1 — ANSWERED (2026-10-19): the ceiling is configuration, and the floor is the five listed
**Settled:** the ceiling is **configuration**, set by the platform admin, inherited by tenants, and a
tenant may only narrow it. **No** hardcoded capability list.
**Settled 2026-10-19 — the floor is exactly this list and nothing else:** **creating or widening
credentials** (minting keys, changing a key's kind) · **granting roles or writing delegations** (the
authority layer itself) · **editing the capability catalogue or the type bundles** (the thing that
defines what it may do) · **writing or erasing the audit ledger** · **anything across tenants**.
Everything else — every business capability — is a setting.

**The owner's answer was *"we follow your recommendations"*, so this is a ruling and not a default** —
recorded as the decision, not as a proposal. `CC-125` is no longer waiting on a ruling; it is waiting on
`CC-128`'s ceiling to inherit from, which is the only thing between the floor and the build.

### D2 — TAKEN AS A DEFAULT, not asked
An Aissistant's authority is **re-checked against the human on every act** (live), never captured at
hire. **This is not offered as a setting**, because there is no legitimate configuration on the other
side: "keep the powers my owner lost" has no use case that is not a defect. Rule 2.2 applies — *if a
sensible default exists, take it, do the work, and say so.* The code already refuses to cache
delegations for exactly this reason (`delegationService.ts:23-31`: *"a revoke that takes effect
'within five minutes' is not a revoke"*). **If you disagree, say so and it becomes a setting.**

### D3 — VOID. I misread one word, and the question does not exist

The owner's sentence was about **types** — *"all that can be on an overall platform level or by tenant"*,
said of *"all the types and settings of agents"*. **I turned it into a question about *agents***, and then
explained it with a business example (a support assistant every customer talks to). That made an
architecture question sound like a product feature, which is why it made no sense: *"what is on this
platform I built a school management system… we are building an architecture."*

Restated correctly, this is not a decision. It is the architecture:

| What | Where it lives | Why |
|---|---|---|
| **A type** — a named bundle of capabilities | **two layers**: shipped by the platform (every tenant sees it), or created by a tenant for itself | exactly how roles already work — some roles ship with the system, some a tenant defines |
| **An agent** — a hired instance | **always inside a tenant** | there is no tenant-less agent, and there should not be |

**And the `tenant_id NOT NULL` measurement is not a defect — it is the design working.** All twelve agent
tables require a tenant (measured: 12 of 12, 0 nullable) because an agent is a thing that acts *inside
somebody's data*. My earlier wording — "platform level has no schema home" — framed a correct constraint
as a gap. The honest reading is: **no such thing should exist.**

**What the misreading did surface, and it is real.** The **type catalogue has only a code layer.**
`AiAgentDefinition` is global code loaded from a generated registry, and a tenant can only **override** an
existing type — prompt, runtime, policy, model allowlist — it cannot **create** one. So "bulk packaged
capabilities, so a standardised agent is cheap to create" works for the platform and does not yet work for
a tenant. That is `CC-126`, rewritten, and **it needs no ruling.**

### D4 — ANSWERED
> *"When owner departs, an admin (or someone with the right permissions) will deactivate or delete his
> account, right? So, while doing so that same admin decides what to do with the related AI agents."*

**Yes — and that is simpler than the three-setting model I proposed.** The decision is made **at the
moment of departure, by the person doing it**, as part of the deactivation flow. What that means for
the build, and it is engineering rather than a question: the deactivation screen must **list the
related agents and ask**, and the default when nobody chooses must be the safe one — **deactivate,
never delete**, because deletion destroys the history that explains what the agent did. The donor
disagreement recorded in the bots analysis (Zulip deactivates and keeps the row; Multica refuses to
delete the owner; Buzz leaves the agent) stops being a decision to make and becomes evidence for the
default. **`CC-127` stays, and its shape changes:** it is no longer "invent a policy", it is "make the
departure flow exist, list the agents, and default to deactivate".

### 4.5 What was left to ask — and the answer (2026-10-19)

**Nothing is left.** The **floor** (`CC-125`) was the last open question and the owner answered it on
2026-10-19: *"we follow your recommendations"* — so the five capabilities below are the floor, and
everything else is a setting. D2 was settled by default, D3 by correction, D4 by the owner, D1's ceiling
by the owner's own principle and D1's floor by this answer.

The floor is the short list of capabilities that **no configuration may ever grant to a machine**, because
they are the capabilities that change the authority system itself:

1. minting or widening credentials (creating keys, changing a key's kind)
2. granting roles, or writing delegations
3. editing the capability catalogue or the type bundles
4. writing to, or erasing, the audit ledger
5. anything that reaches across tenants

**Why a floor at all, if the ceiling is configuration:** a machine that can grant itself authority makes
every other control decoration — the locks would be held by the thing they are meant to lock out.
**Everything else — every business capability — is a setting the platform admin controls and tenants
inherit a subset of.**

*This paragraph used to end "Say 'no floor' and I will build it without one." **Removed 2026-10-19** —
the owner answered the question, so an open invitation here would contradict the section's own heading
and invite a reader to reopen a settled ruling.*

### 4.6 NOTE — the platform has no ceiling over its tenants *(owner, 2026-10-18 — **DECIDED 2026-10-19: option A; option B deferred as `CC-133`**)*

> *"One architectural flaw this discussion exposed, the lack of control of platform superadmins on what
> is allowed or not within each tenant. And the fact that we can't have agents that serve superadmins…
> If each tenant has its own superadmin, then later we will need to develop a control hub on the top of
> all that. If superadmins set the system for all tenants then we need to use instance 1 and a
> foundational tenant where we do settings, develop functionalities, templates, etc. and allow other
> tenants to inherit it (or limit other tenants to what we allow for that one)… when a new functionality
> is developed and served to all tenants to use (for free or subscription) where will that one land if
> there is no platform level management (which would include what will the platform allow tenants to use
> from the overall agents capacities. One capacity may include changing platform architecture — that
> should maybe be platform level, not tenants)."*

**This is not a question a ruling can close. It is a missing layer, and it is larger than the agent
spine.** Recorded here so it is not lost, and measured so the record is fact rather than impression.

**1. There is no per-tenant ceiling store — so D1's answer has nowhere to live.** `Tenant`
(`directory/data/entities.ts:5-26`) holds `name`, `is_active`, timestamps, and nothing else. There is
**no plan, feature, limit or settings table** anywhere in `packages/` (searched for `TenantModule`,
`TenantFeature`, `TenantSetting`: no hits). D1's answer — *"the platform admin sets the ceiling, a tenant
may only narrow it"* — is the right answer **with no column to be stored in**. `CC-125`'s ceiling cannot
be built before this layer exists; that ordering is now a dependency, not a preference.

**2. "Platform level" is currently a tenant row that is read globally.** Both ACL tables declare their
tenant scope **mandatory** — `UserAcl.tenantId` and `RoleAcl.tenantId` are `uuid NOT NULL`, each
commented *"Tenant scope is mandatory for ACL evaluation"* (`auth/data/entities.ts:346-347`, `:381-382`).
But `isGlobalSuperAdmin` queries them **with no tenant filter** (`rbacService.ts:242`, `:267`), and when
it answers true, `loadAcl` returns `{ isSuperAdmin: true, features: ['*'], organizations: null }`
**before the requested scope is consulted at all** (`:309-314`). So **a superadmin of one tenant is a
superadmin of every tenant.** This is precisely the second encoding of "platform level" the red team
counted (W8, check 1) — and it is the load-bearing one, not a stray helper.

**3. The entry into another tenant is a cookie.** `applySuperAdminScope`
(`shared/lib/auth/server.ts:189-220`) overwrites `next.tenantId` from the tenant cookie, sets
`isSuperAdmin = true`, and performs **no membership check** — there is nothing to check against, because
no table says which tenants a person belongs to.

**4. And the flag can be minted from inside a tenant.** `PUT /auth/users/acl` accepts
`isSuperAdmin: z.boolean().optional()` (`:24`) and, when the **actor's** ACL is superadmin, **skips every
target guard** (`:61`) before writing. Combined with (2), a tenant's superadmin can mint more *global*
superadmins.

**What the owner's direction gives us — the shape to design against, none of it built:**

| The owner's words | What it means structurally |
|---|---|
| *"instance 1 and a foundational tenant"* | one tenant is the **source**: settings, templates, functionalities and types are authored there |
| *"allow other tenants to inherit it (or limit other tenants to what we allow for that one)"* | inheritance is a **narrowing** relation — the foundation is the ceiling, never a peer |
| *"where will that one land if there is no platform level management"* | a new capability needs **one place to be switched on**, and a per-tenant answer to free-vs-subscription — which is item 1 above |
| *"one capacity may include changing platform architecture — that should maybe be platform level, not tenants"* | that capability belongs on **the floor** (`CC-125`), never in a tenant's bundle — the same floor, seen from the other side |

**And it answers the question about agents that serve superadmins.** An agent is always inside a tenant
(§3.1), so an agent serving the platform's superadmins has no home until this layer decides *what the
platform itself is* — a tenant with extra rights, or something above every tenant. The gap and the
agent's placement are the same gap.

**★ DECIDED 2026-10-19 — OPTION A: the platform's admins live INSIDE the foundational tenant.** The
owner's answer: *"we follow your recommendations"*, on the recommendation that A is the smaller step, is
his own sentence, and leaves B reachable. So the platform's superadmins are the superadmins of **instance
1 / the foundational tenant**, which is where settings, templates, functionalities and types are authored
and from which every other tenant inherits — **or is limited to what it allows**. Two consequences, and
both are deliberate rather than accidental:

- **Inheritance is a narrowing relation.** The foundation is the ceiling, never a peer. A tenant may
  choose a subset; nothing may choose a superset.
- **The walk-into-another-tenant behaviour stops being an accident.** Today it happens because
  `isGlobalSuperAdmin` reads a tenant row with no tenant filter. Under A it becomes an **inheritance
  rule with a name**: the foundational tenant's admins act above the tenants that inherit from it,
  because that is what the foundation is *for* — not because a query forgot a `WHERE`.

**The build that follows, and it is a build not a question:** a **per-tenant ceiling store** (the missing
table — today `Tenant` holds `name`, `is_active` and timestamps and nothing else), the foundational-tenant
relationship, and a cross-tenant admin act that is **recorded** as such rather than inferred from a badge.
**Register:** `CC-128`, now startable.

**★★ OPTION B IS DEFERRED, NOT DROPPED — and it carries a trigger, not a date.** The owner's instruction,
2026-10-19: *"document option B to develop later after we finalize the pipeline and the platform is fully
operational."* **Register: `CC-133`.** B is: the platform's admins are **above** every tenant, held in a
row that belongs to no tenant — the first genuinely platform-level table. What B would change, and why it
stays worth doing:

| Under A (today's decision) | What B would fix |
|---|---|
| "platform admin" and "admin of the foundational tenant" are **the same thing** — the ambiguity this code already suffers | they become two different things, so neither word has to be read in context |
| cross-tenant reach is a **rule** (the foundation's admins act above inheritors) | it is a **structure**: an admin of a tenant has no path to another tenant at all |
| an agent serving the platform's superadmins has **no home** — it must sit inside the foundation, which is a tenant | it gets a home, because the platform itself has an identity |
| the foundation is special **by convention** — the first row, the source of templates | it is special **by schema** — the only table that is not tenant-scoped |

**Why deferring is safe rather than a compromise:** A is a strict subset of B's shape. Under A the ceiling
store exists, the inheritance exists, and every tenant-scoped row already carries its tenant. B is then
**adding a layer above**, not rewriting one below — which is the same reason A was recommended. **The
trigger is the owner's own sentence:** *after the pipeline is finalised and the platform is fully
operational.* Recorded so that "later" has a meaning, and so that B is not rediscovered as a surprise.

**Refused now, by name:** a **sentinel tenant id** for "the platform" — the same refusal as `CC-126` and
for the same reason: a value every query must remember to exclude is a latent cross-tenant read. **This
refusal survives A**, and it is what keeps B honest: A does *not* get to fake a platform layer with a
reserved id, because that is the version that would make B unbuildable.

---

## 5. The work — eight workstreams

Each workstream names: the **R&D question** it must answer, the **expert lens** that reviews it, what
**lands**, and the **gate** that must be green before the next one starts. The register rows are in
`MASTER-CHECKLIST.md` §5.

### W1 — The actor, not the credential · `CC-121`
**Question.** What is the stable actor id that a binding, a delegation, a denial, a role assignment and
an audit row all point at — such that rotating a credential changes nothing else? Paperclip separates
identity (Ed25519, survives restarts, never silently replaced) from permissions; Zulip puts the key *on*
the identity row. We put the identity *on* the key, which is the one arrangement that loses it.
**Lens.** Identity & authority architect.
**Lands.** An `agent_identity` row; credential rows that hang off it; a migration for every existing
`principal_id`; a documented rule that no authority structure may key on a credential id.
**Gate.** Rotate a key in a test: bindings, roles, delegations, denials and audit rows all survive,
and the audit trail stays one actor.
**Precondition — `CC-92` Slot 0.** The 13 spine findings must be closed first
(`PREVIEW-AUDIT-TRIAGE.md` §6.2): this migration re-keys every `principal_id`, and the gate it re-keys
through cannot see seven modules' commands (`T-07`) or refuse a missing identity (`T-27`). A migration
through a gate with holes produces a clean answer about a partial system.

### W2 — Hire: the instance · `CC-122`
**Question.** What is the smallest row set that makes "hired" a fact — kind, owner axis, lifecycle
state, soul home, budget, stable audit id — and how does a code-declared definition version without
rewriting the instances already hired from it?
**Lens.** Agent-platform engineer (Paperclip's gated hire: prepare → verify with a **real liveness
probe** → ready; a failed verification must not repeat setup).
**Lands.** `agent_instance` (tenant-scoped; per-user **state**, not per-user home — see W6); a lifecycle
state machine with a probe; `template_version` pinned on the instance, upgraded explicitly, never in
place.
**Gate.** Two tenants hire the same definition and get two different objects; an instance cannot reach
`ready` without its body having been probed; a version bump does not silently change a hired instance.

### W3 — One chokepoint, three sources · `CC-123`, `CC-124`, `CC-125`
**Question.** How does one function answer *"may this actor do this, here, now"* for all three standings
— own, delegated, run-scoped — such that every source only narrows, and the human half of a delegation
is read live?
**Lens.** Identity & authority architect; hostile reviewer.
**Lands.** The chokepoint (route `invokerCeilingFor`'s proven logic through every path, including HTTP
and the non-enforce mode); the decision-intersection for Aissistants; **the X2 fix** (normalise the
principal id at every write and read, or store one canonical form — and prove it with a test that
writes the prefixed form and expects it to apply); **the actor-class gate** (`CC-125`): every route
declares human-only, machine-only, or both, and the default is neither.
**Gate.** A delegation written in the prefixed form applies; a denial written in the prefixed form
blocks; a machine cannot reach a human-only route; a delegate can never exceed the grantor *at act
time*, proven by revoking the grantor mid-flight.

### W4 — The settings that only narrow · (extends `SR-06`, `SR-09`)
**Question.** Which parts of the agent are settings, who owns each, and which of them must be
**impossible** to set because they would change a security property?
**Lens.** Agent-platform engineer.
**Lands.** The capability surface, with an owner per item: **persona/soul** (core owns the folder and
its versioning; the engine owns the meaning — Paperclip owns the folder, Hermes owns the meaning, and
we need the first without losing the second); **skills** (`SR-06`, versioned `SKILL.md`, with
provenance, approve and revoke — an unapproved skill is a permission widening by document);
**memory** (core owns the binding and what may enter a prompt; the engine owns retrieval — and memory is
**never** business truth); **tools** (already narrowing, F2); **model and budget** (per task class, with
background traffic never on the expensive lane).
**Never a setting, named:** the tool ceiling, the mutation policy upward, `requiredFeatures` removal,
tenant/principal/run identity, secret values, `baseUrl` as free text, loop budget above the declared
maximum, and approval mode for unattended runs.
**Gate.** Every item on the "never a setting" list has a test that attempts to widen it and fails.

### W5 — Durable runs · (`C4-1`, `C4-2`, `C4-3`, `C4-4`, `C4-8`)
**Question.** What is the smallest set that makes an agent a *worker* rather than a pet — and what is
the convergence test that proves it?
**Lens.** Agent-platform engineer (Paperclip's automations, read at source).
**Lands.** Finite runs with continuity in the database; the three-way invariant (*live path · durable
wait · visible disposition*); continuations with **idempotency keys**; a reconciler that honours human
cancellation; a budget ceiling that pauses. **And `C4-5` as an acceptance test, not a component:** the
DOT-2 loop is a completion contract that never converges, and the cure is the contract, never a slower
poller.
**Deferred by name:** the watchdog, routines, idle-sleep, and the runner (Hermes is already
out-of-process behind the port).
**Gate.** Kill the process mid-run; work resumes; no duplicate effect; the DOT-2 test is green.

### W6 — Placement and tenancy · `CC-126`, `CC-127`, `CC-128`
**Question.** Per-user instances or per-user state — and where does a platform-level agent live?
**Lens.** Multi-tenant SaaS architect.
**Lands.** The placement matrix; **per-tenant home, per-user state** (measured reasoning in §8.2 — a
home per user is a home per assistant, on one shared volume, with no per-tenant boundary); paired
**partial** unique indexes, because a plain unique over a nullable `organization_id` lets duplicates
through — a failure this repo has already recorded twice; the departure state machine from D4.
**`CC-128` is the prerequisite the owner named (§4.6), and it is the one part of this workstream that
cannot be built by us alone:** *where does a platform-level agent live* has no answer until the platform
has a place to be — today "platform level" is a tenant row read globally, so an agent serving the
platform's superadmins would have to live in some tenant and be read everywhere. The ceiling store and
the foundation-vs-above decision come first.
**Gate.** 200 users with two assistants each do not create 400 homes; a duplicate is rejected by the
database, not by a convention; offboarding a user reaches every binding, delegation and cache; and no
agent reads across tenants to serve "the platform".

### W7 — One surface proves the spine, then the others attach
**Question.** Which surface is the cheapest *complete* proof that the spine works end to end?
**Answer: chat.** It is the only one that exists, and it is where the machine axis is already
half-built (`CC-107` closed the read half; `CC-120` closed the identity half and is waiting on a
ruling). The order after that is by maturity, not by ambition: **workspaces** (does not exist as a
module), **automation** (cannot wake durably until W5), **widgets** (sits behind automation and the
risk-on-command work, `CC-63`: 0 of ~93 commands declare risk).
**Gate.** A surface may not start until it has its own written `SR-*` and the spine's conformance test
passes from inside it. No surface may add a second way to answer "may this act here".

### W8 — The ratchets that stop the drift
**Question.** What can be *measured* that tells us the spine is being forked?
**Lands.** Three checks, each of which is a count, not a feeling:
1. **One representation of "platform level"** — any second encoding, or any new nullable `tenant_id`,
   fails. *(Signal the red team named: four scope dialects.)*
2. **One authority predicate** — at most one function taking an agent id answers "may this act here";
   a second one fails. *(Signal: four authority predicates.)*
3. **One type branch** — at most one `type ===` site, and it lives in the resolver. *(Signal: four type
   switches.)*
**Gate.** These are wired into CI, not left as scripts somebody can run — `CC-101`'s lesson: *a checker
is not a control until something calls it.*

---

## 6. The sequence, and what it costs to skip it

```
D1..D4 rulings  ──────────────────────────────►  (no code before these)
        │
CC-92 Slot 0   ──────────────────────────────►  (the spine set: 13 findings, §6.2 of the triage)
        │                                        W1 does NOT start until these are closed
        │
W1 actor ≠ credential  (CC-121)
        │
        ├── W3 chokepoint + actor-class gate  (CC-123/124/125)   ← X2 fix lands here, first
        │        └── CC-92 Slot 1 (10 findings) rides this gate
        │
        └── W2 hire: the instance  (CC-122)
                │
                ├── W4 settings that only narrow
                ├── W6 placement (CC-126/127)
                └── W5 durable runs
                        │        └── CC-92 Slot 2 (T-43) rides this gate
                        │
                        └── W7 chat proves it → workspaces → automation → widgets
                                │        └── CC-92 Slot 3 (4 findings) rides this gate
                                │
                                └── W8 ratchets, wired to CI
                                         └── CC-92 Slot 4 (3 findings) rides this gate
```

**Why `CC-92` Slot 0 comes before `W1`.** `CC-121` re-keys every `principal_id` in the system. The gate
it re-keys through cannot see seven modules' commands (`T-07`: 15 core modules carry `commands/`, 8
declare a capability — re-measured 2026-10-19), and one scope helper accepts a missing identity (`T-27`,
re-confirmed the same day). So W1's own gate — *"rotate a key: bindings, roles, delegations, denials and
audit rows all survive"* — **cannot be proven for the modules the gate does not reach.** A migration
through a gate with holes produces a clean answer about a partial system. **The spine is repaired
before it is re-keyed.** The 13 findings and the reasoning: `PREVIEW-AUDIT-TRIAGE.md` §6.2, carried as
`MASTER-CHECKLIST.md` §9.4.

**Why the rest ride their workstreams rather than a separate campaign.** Each slot's findings are the
contracts of code that workstream already has open — the chokepoint's own validators (`W3`), the repeat
detector that wants idempotency keys (`W5`), the design system the first surface inherits (`W7`), and
the tests that cannot fail (`W8`). Repairing them where the code is open costs one review, not two.

**Why W1 before W2.** Hiring onto a credential id means every hire is un-hired by the next rotation.
**Why W3 before W2.** An instance that can be created but whose authority cannot be decided is a row
with no behaviour — the exact "contract after the code" defect the register already names (`CC-12`).
**Why chat before workspaces.** Chat exists. A proof that costs one route is worth more than a design
that costs four.

---

## 7. Refused, by name

- **A `kind` / `type` column that selects the permission algorithm.** The confused-deputy shape, and
  the branch asymmetry `principal.ts` was written to abolish.
- **Intersecting permission *lists*.** It denies everything in one direction (`*`) and widens row scope
  in the other (`.own`).
- **A magic tenant id for "platform level".** A sentinel every query must remember to exclude is a
  latent cross-tenant read.
- **A home directory per user.** Measured cost, one shared volume, no per-tenant boundary, and a backup
  and deletion problem at offboarding (§8.2).
- **Freezing the Aissistant's authority at hire.** It converts a revoked permission into a working one.
- **Building the four surfaces concurrently.** Four maturities, four migrations, one plan.
- **A second authority predicate per surface.** The drift signal, and the thing W8 counts.
- **Importing Hermes's profile model as the tenant boundary.** Hermes's own docs say a profile is
  isolation of *state*, not a sandbox, and not tenancy.
- **A `rotate` implemented as delete-and-create.** That is the current behaviour and it is X1.

---

## 8. The reviews — what each one changed

Four independent reviewers, each given the code paths rather than a summary. What follows is only what
**changed this document**; agreement is not repeated.

### 8.1 Identity & authority architect

- **Corrected my model of the subject.** `derivePrincipal` prefers `auth.keyId` over the parsed prefix
  (`principal.ts:133`), so **the prefix is not authoritative**. Consequence: never let a string encoding
  be the security-relevant identity; resolve from the row. This is now W1's core requirement.
- **Disproved the intersection as stated** (§3.2 is his argument, verified against
  `featureMatch.ts:25-77`, `rbacService.ts:405-409,620-625`). This is the single largest change to the
  plan.
- **Found X2** (the denial encoding) and **the delegation counterpart** — I verified both at source
  before recording them.
- **Named the inversion in our RFC 8693 mapping:** we mint `sub` = machine with the human riding as a
  non-standard `onBehalfOfUserId`. Delegation semantics want `sub` = assistant, `act` = human. That
  changes what the token should be, and it is now part of D2.
- **Ranked the three worst defects**, and the first two are W1 and W3.

### 8.2 Multi-tenant SaaS architect

- **Corrected F3's neighbour:** `AiAgentRuntime` is a *host/daemon*, not an agent — "one runtime hosts
  many agents" (`entities.ts:1142`). An instance is a new table, never a column there.
- **Answered W6 decisively: per-user instances are NOT viable.** 200 users × 2 assistants = 400 homes,
  ~3.8 MB of skills seed each plus config, state, and a memory index — 2–8 GB **per tenant**, 400 SQLite
  files to back up and delete atomically, on one shared volume with no per-tenant boundary. The
  one-writer rule is satisfied by a profile lock, not a process, so the cost is disk and restore time,
  not concurrency. **Per-tenant home + per-user state.**
- **Found the schema blocker for "platform level":** `tenant_id` is NOT NULL on every row. There is no
  home for a platform-level agent, and it will be faked with a sentinel unless D3 is answered.
- **Found the precedent I had missed:** `AiChatConversationParticipant.agent_owner_user_id`
  (`entities.ts:917`) already exists — a per-user agent axis, shipped, in the one surface that works.
- **Named the index failure mode with two in-repo precedents:** a plain unique over a nullable
  `organization_id` lets `(t, o, c, NULL, 'a')` duplicate freely; both
  `Migration20261017120000:44-65` and `Migration20261017180000:20-33` record it.

### 8.3 Agent-platform engineer

- **Mapped the four layers onto our code and found the conflation:** body is present and richer than
  Paperclip's three-method contract; **soul is conflated** — `AiAgentPromptOverride` is a prompt *patch*,
  not a home, with nothing the agent writes back; **identity is missing as an agent property** (a binding
  is a grant, not an identity; `agentKind` is a free string on the envelope); permissions are correct
  and are the strongest layer.
- **Named `F1`, which I had not seen:** `AiAgentDefinition` holds body, soul *and* permission ceiling in
  one code object, so one edit can change the model and the tool ceiling with no review boundary.
- **Gave the minimal complete capability set** (14 rows) and marked three as absent: instance, durable
  run, memory binding.
- **Decided the Hermes boundary per item** — core owns *what may enter a prompt and what may leave the
  tenant*; Hermes owns *how*. That sentence is now W4's rule.
- **Found two settings that can widen today:** `loop-override/route.ts:30` accepts 1–1000 with no
  comparison to the declared maximum, and `entities.ts:293`'s `baseUrl` is free text.

### 8.4 Hostile red team

- **Named the weakest assumption, and it survived the other three reviews:** that *type* is a
  configuration axis, so authority is one set operation. The falsifier is a ticket-worker whose assignee
  lacks a permission the task requires and which must still run — Multica's entire design. If that must
  work, the single-set-operation model is dead, which is why standing is an **axis** and not a formula.
- **Named the three drift signals** that became W8, each with an observable count.
- **Named the deferrals that this document adopted:** platform/tenant duality until a real consumer
  exists; the Aissistant intersection until the Hermes path stops carrying one superadmin identity;
  and the four-surface adaptation while `CC-63` records 0 of ~93 commands declaring risk.
- **Named the avoided decision** — *is an agent a principal in its own right, or only ever a human's
  hands?* — which is D1, and observed that "same agent, different settings" is the mechanism for not
  answering it. That is the most useful sentence in the review and it is why D1 is first.
- **Named the under-engineering:** the actor-class gate, the departure state machine, platform-level
  ownership semantics, DB-enforced cardinality, and a migration path gated on `CC-119`. All five are now
  in the work.

**What all four agreed on:** one core, one identity row shape, one binding table. And all four said
some version of the same warning — *the surfaces are not the work; the spine is.*

---

## 9. What this document does not claim

1. **It is not a build plan for the surfaces.** It sequences them and gates them; it does not design
   workspaces, automation or widgets. Those need their own `SR-*`.
2. **It does not overturn `SR-18`.** D1 asks the owner to rule; until then the cap stands.
3. **It does not claim the four reviews are exhaustive.** They read the paths named in §2 and §8. They
   did not read 1M lines, and no review can.
4. **It does not re-measure the platform's tenancy.** `SR-12` and `CC-84` are quoted from the register;
   neither was re-verified in code for this document, and `CC-119` exists precisely because the
   database state behind them has never been proven. **What §4.6 *did* measure is the ACL and superadmin
   layer only** — four reads, named by line — and that is the whole of the evidence behind `CC-128`.
5. **It does not claim the X2 fix is large.** It is small. It is in the register because a *small*
   fail-open is still fail-open, and because this project's through-line is controls that look alive.

---

*Written 2026-10-18. No code. The register rows are `CC-121` … `CC-128`; the rulings are D1–D4 and
they are the owner's. **§4.6 is a note, not a workstream:** it records a missing layer the owner named,
measured, and left to revisit before `CC-125` is built.*
