# The Specifications Dictionary

**What this is.** The standard every change to this platform is checked against, the way MVC is a
standard for how a web app is arranged. It exists because the platform is expandable — new tables, new
columns, new functions, new agents appear over time — and without a fixed standard the permissions get
set for the tables created today and forgotten for the ones created tomorrow. That is the flaw this
document is built to prevent.

**How it is used.** It is not a document you read once. It is inherited into **gates and guards** inside
the platform, so a change that violates a standard **cannot land**. The document and the code say the
same thing; when they drift, that is itself a defect.

**Owner's instruction, 2026-10-06:** *"a specifications dictionary which is similar to frameworks
standards — like mvc — which standardize system architecture changes protocols and demands... and make
sure to have that as a bible in our development work and inherit it into gates and guards within the
platform functionalities, prompts mechanism, etc... so we do not end up having permissions for some
tables, then forgetting to add to other tables created later and similar gaps and bugs generating
flaws."*

**Status:** this is the first version. Every clause is either **ENFORCED** (there is a guard today),
**PLANNED** (a guard is designed but not built), or **DECLARED** (the rule exists, enforcement is manual
for now). A standard with no enforcement is stated honestly as such — not presented as a guard.

---

## Part A — The twelve uncompromisable standards

These are the non-negotiables. They answer the owner's question: *what must hold, always, so that
versatility does not become an unmanageable mess?* Each one is a **standard**, not a preference. A change
that breaks one does not land.

### S1 — Every architectural change is gated and inspected before it is applied

No table, column, field type, entity, function, agent or model is added, changed or removed without
passing a fixed protocol. The protocol is Part B. **Nothing lands by being convenient.**

*Why:* a change applied without inspection is how a platform drifts into an inconsistency nobody can
reconstruct later. The gate is what converts "we meant to" into "it is".

### S2 — Every architectural change answers the permissions question

**This is the standard the owner named.** When new data structure appears — a new table, a new column, a
field-type change — the platform **must not** allow it to land until permissions for it are decided,
either by a person or by a rule. The default is: **grant full permission to the superadmin role and
create the permission records**, so nothing is ever invisible and nothing is ever open by accident.

*Why:* permissions set for the tables that exist today, forgotten for the tables created tomorrow, is
exactly the "gaps and bugs generating flaws" the owner described. The answer is not to remember harder;
it is to make the question **unskippable**.

*State:* **PLANNED** — the gate is designed (Part C.1) and not yet built. Until it is, this is a manual
checklist item, and every change record must say which permission each new field received.

### S3 — The platform tells the user when access is refused

When a prompt asks for something the user may not see — a column, a table, or someone else's records —
the platform **says so**. It does not silently return a smaller answer that looks complete.

*Why (owner's decision, 2026-10-06):* strict without disrupting the flow. A blocked prompt that explains
itself is both. Silence would let a person believe an incomplete answer is complete, which is the one
outcome a compliance platform must never produce.

*State:* **DECLARED** — the rule is decided; the wording and the seal are to be built with the data
permissions work.

### S4 — Data is the gate, not the screen

Access is decided by **what data a user may reach** — which tables, which columns, and what kind of
access (read / write / edit / delete / own / team / global) — and only secondarily by which screens or
functions exist.

*Why:* in a platform where a prompt can compose any query, a permission on a screen is never consulted.
A permission on the data is, because it sits on the way to the rows. (Owner's own reasoning, 2026-10-06,
independently arrived at; measured to match what the platform already half-builds.)

*State:* **PARTIAL** — per-table gate (`aclFeatures`, fails closed) and per-column policy (`fieldPolicy`)
exist; the own/team/global row scope does not. Coverage is 6 of 67 tables. See
`analysis/owner-workthrough-data-permissions.md`.

### S5 — One permission engine, never a second one

Data permissions **extend** the engine that already exists. They do not become a rival system beside it.

*Why:* two systems that can disagree give the project two answers to one question, and the drift is
invisible because both look authoritative. A parallel permission scheme was already rejected once on
this project by a critic pass.

*State:* **DECLARED** — binding on the design; enforced by the fact that the existing engine is the only
one wired into the enforcement path.

### S6 — Every model a job uses is declared

No job runs without a declared model. Model choice is one picture, built from the per-agent overrides
that already exist in the database.

*Why:* the owner may run an open-source model for one task, OpenAI for another, DeepSeek for a third. If
the choice is scattered, no one can say what serves what.

*State:* **PARTIAL** — providers, a settings screen and per-agent overrides exist and are saved; the
single declared picture and the "no declared model → no run" rule do not.

### S7 — Chat is a legitimate unclassified state

A prompt is not sorted into a category at the door. Its ending — a one-off answer, a proposal, a saved
Function, or just conversation — is **observed as the work goes**, and may change direction.

*Why (owner's correction, 2026-10-06):* classifying at the entrance limits what a prompt can become.
Some prompts are just chat, with nothing to classify.

*State:* **TO REBUILD** — the existing G-21 triage does the rejected up-front classification. This is
the highest-priority correction in the current work.

### S8 — The platform notices and suggests, and never acts without asking

When the same request repeats, the platform offers to save it as a Function. It **asks**; it never saves
on its own.

*Why (owner, 2026-10-06):* it shows platform intelligence and should appear wherever it is useful. But
an unasked-for save is a change nobody approved.

*State:* **TO BUILD** — needs a per-user request history and a similarity signal.

### S9 — Core functions ship with the platform and cannot be deleted

Some functions are part of the platform itself — managing roles and permissions is the example the
owner named. They arrive with the platform, are present by default, and are **not subject to deletion**.

*Why:* a platform whose own control surfaces can be removed by a user is a platform that can be made
uncontrollable by accident.

*State:* **DECLARED** — the rule is set; the marking mechanism (a flag on the function record plus a
guard on the delete path) is to be built.

### S10 — Every standard in this dictionary has a home in code, and drift is a defect

A standard that lives only in a document is a wish. Every clause here either has a guard today, or is
marked PLANNED and tracked, or is marked DECLARED with the reason enforcement is manual. **When the
document and the code disagree, that disagreement is itself a defect to be fixed.**

*Why:* this is what keeps the dictionary a bible rather than a shelf item.

*State:* **DECLARED** — this document's own status marks are the implementation.

### S11 — Structural permissions are explicit, per object and per verb, and inherited by default

Every governable object — a **table, a column, a relation, a function, a widget, an agent** — carries a
**structural permission block**: for each verb (**read / add / edit / remove / reference**) and each actor
(human / AI), a level: **straight**, **review**, **approval**, or **never**.

*Why (owner's proposal, 2026-10-06):* "for this table, can we add/edit/delete columns, each a separate
permission; can the AI do it straight, does it need review, does it need approval; can this column be used
as a reference." It is finer than one tier per change kind, and it is the **same shape** as the data
permissions, so there is one mental model rather than two.

*The reference verb is its own permission, deliberately:* a column that others may **reference** becomes
part of the platform's public surface — changing it later breaks dependents. Marking a column
`never`-referencable keeps it private detail; `straight`-referencable makes it public API. This connects
to **G-10** (dependency tracking) and the kernel's `rename.ts` planner.

*State:* **DESIGNED, NOT BUILT** — grammar and fit in
[`ARCHITECTURE-structure-permissions.md`](ARCHITECTURE-structure-permissions.md). Plugs onto the existing
`MutationGuard`; needs a settings block, an `escalate` outcome, and the actor-type input.

### S12 — The actor type is part of every structural decision

A rule may say what **the AI** may do and what **a human** may do, **separately**. Neither is inferred
from the other, and the AI is never assumed to inherit all of a human's structural reach or vice versa.

*Why:* the whole reason this platform needs structural permissions is that an AI can now propose changes
to the platform's own shape. A permission model that cannot name the actor type cannot answer the
question that matters.

*State:* **TO BUILD** — needs `actorType` on the guard input. The AI path already knows it is the AI
path, so the input is knowable, not guessed.

---

## Part B — The change protocol

Every architectural change walks these steps in order. A step that cannot be completed stops the change;
it does not get skipped.

| # | Step | What it means | Gate today |
|---|------|---------------|------------|
| B1 | **Declare** | Name the change: what kind, what it touches, what it is for. | `StructureChange` type exists |
| B2 | **Conflict analysis** | Compare against existing structure; report clashes. | `detectConflicts` exists and **blocks the build** — called by the module-registry generator, which `throw`s on any error (`module-registry.ts:3284`), and by the CLI umes check. **Not yet pointed at an AI-proposed change.** |
| B3 | **Permissions** | Decide and record permissions for every new field/table — default full grant to superadmin. | **PLANNED (S2)** |
| B4 | **Tier** | Assign the review tier (see C.2). | `triage.ts` exists; mapping empty — fails closed to strictest |
| B5 | **Evidence** | Run the checks the tier demands (install, typecheck, lint, test, build). | Cookbook rule 3 — green tree before next batch |
| B6 | **Approval** | A person sees the report and approves. | every change stops for approval today (safe default) |
| B7 | **Apply** | The change lands. | — |
| B8 | **Record** | The change, its permission records, and its tier are written down. | Journal + backlog convention |

**The rule:** B3 and B4 may not be skipped. B3 is the owner's standard; B4 is what decides who looks.

---

## Part C — The three specifications the owner asked to be checked every time

### C.1 — How a change is reflected in roles and permissions (S2)

When new structure appears, the platform runs this check before the change lands:

1. **Enumerate the new surfaces.** Every new table, column, or field-type change produces a list of
   thing-it-creates.
2. **For each one, require a permission decision.** Either a person chooses, or the default applies:
   **full permission to the superadmin role**, plus **a permission record created** for the new surface.
3. **Write the records.** The permission records go into the roles-and-permissions store — the same
   engine as everything else (S5).
4. **Refuse to land without it.** If neither a decision nor the default was applied, the change does not
   apply. This is the unskippable part.

**Amended 2026-10-06 — a new surface gets TWO blocks, not one.** When a new object (a table, a column, a
relation) appears, the gate installs **both**:

- the **data permission** — who may read/edit/write the *values* (the existing per-table / per-column
  grant); and
- the **structural permission** — who may *add / edit / remove / reference the object itself* (S11).

A new column is not "permitted" until both are set. This is the owner's `premium_permissions` idea, and
its full design is [`ARCHITECTURE-structure-permissions.md`](ARCHITECTURE-structure-permissions.md).

**Why the default is "full to superadmin":** so a new table is never invisible to the only role that can
fix it. Invisible-to-everyone is a silent failure; visible-to-superadmin is a safe starting point an
admin narrows from.

### C.2 — How a change meets the tier question (this is item 17, resolved)

**Status 2026-10-06:** item 17 is still answered — but the tier table below is now the **default beneath
a finer mechanism**, not the mechanism itself. The owner proposed the better shape (S11/S12): a
structural permission set per object, per verb, per actor. When such a permission exists, **it decides**;
when none is set, **this table decides**; both fail closed. See
[`ARCHITECTURE-structure-permissions.md`](ARCHITECTURE-structure-permissions.md) §3 for the comparison.

Item 17 asked: *which risk tier does each kind of structure change sit in?* It was left open as an owner
decision, with the safe default that **every** change stops for explicit approval.

**The owner's instruction resolves it — the tiers follow from the standard, not from a hand-picked
table.** So:

- The **tiers themselves** are the vision's three: `safe` · `review_required` · `explicit_approval`
  (the exact names in code — `ChangeRiskTier` in `packages/shared/src/lib/request-outcome/types.ts`).
- The **mapping** lives in the dictionary (here) and is inherited into the code in one place
  (`CHANGE_KIND_TIER` in `packages/shared/src/lib/request-outcome/triage.ts`).
- **The default is the strictest tier.** A change kind not named below is `explicit_approval`. A change
  the classifier could not describe at all is also the strictest — "we did not recognise this" is not
  evidence of harmlessness.
- **Even the safest tier still requires the user to see it.** `safe` means *may publish once tests pass*,
  never *may happen unseen*.

**The first mapping, derived from the standards above** (to be confirmed with the owner before it is
written into code — see the question at the end):

| Change kind | Tier | Why |
|---|---|---|
| Add an optional column to an existing table | `review_required` | touches data shape; needs conflict + permission check (S2) |
| Add a new table | `explicit_approval` | new data surface; new permission records required (S2) |
| Change a field's type | `explicit_approval` | can break existing data; not reversible by default |
| Add an index or a non-behavioural hint | `safe` | no data shape change; still shown to the user |
| Add a screen or a widget over existing data | `review_required` | no new data, but may expose existing data differently (S4) |
| Remove a column or table | `explicit_approval` | destructive; "nothing is deleted before it is analysed" (cookbook rule) |

**This table is the answer to item 17.** It is derived, not invented, and it lives in the dictionary so a
new change kind is added here first — then in code.

### C.2b — The tiers, the defaults and the fallbacks are SETTINGS, not hardcoded *(owner, 2026-10-06)*

> *"concerning tiers, default ones and concerning fallbacks. let's not make it hardcoded but a setting a
> superadmin can change. I think that makes more sense."*

**Accepted, and it is the right call.** The dictionary's table above is the **first value**, not the
mechanism. The mechanism is a **setting a superadmin can change**, without a code deploy.

**How it is stored — and it needs nothing new.** The platform already has exactly the right table:

- **`module_configs`** (`packages/core/src/modules/configs/data/entities.ts`) — `module_id` + `name` →
  `value_json`, with a **global (instance) row** and optional per-tenant overrides.
- **`ModuleConfigService.getValue(moduleId, name, { defaultValue, scope })`**
  (`configs/lib/module-config-service.ts`) — **already** resolves *tenant row → instance row → the
  supplied default*, and `setValue()` already lets an authorised user change it. This is the platform's
  own convention, already used for policies such as `entities.newEntitiesRestrictedByDefault`
  (`entities/api/entity-settings.ts`). **S5 — one engine, never a rival — so we use it rather than invent
  a settings table.**

**What becomes a setting (all three, together):**

1. **The tier mapping** — which change kind sits in which tier. Replaces the frozen `CHANGE_KIND_TIER`
   object in `packages/shared/src/lib/request-outcome/triage.ts` with a read from module config.
2. **The default tier** — what an unnamed change kind gets (today: `explicit_approval`). Still **fails
   closed** if the setting is missing or malformed — a bad setting must never soften the default.
3. **The structural-permission fallback level** (S11/Q2) — where an unconfigured object lands, mapped to
   the standards' default values as the owner required.

**Key:** one module config, e.g. module `request_outcome`, name `structureChangeTiers`
(`entities.newEntitiesRestrictedByDefault` is the shape to copy). Read through a **function**, not a
constant, so the two call sites (`triage.ts`, the structural guard) share one source.

**Guardrails that do not move just because it is now a setting:**

- **It still fails closed.** Missing/invalid setting → `explicit_approval`, never `safe`.
- **It is itself a gated change.** Changing the tiers is a structural change (S1/S2) and is audited like
  any other — a superadmin may change it, but the change is recorded, not silent.
- **The dictionary stays the source of truth for the default values.** The setting may be edited; the
  *reason* for each value still lives here, so a changed value can be reviewed against the standard.

This is item **SD-3**, restated: not "write the mapping into code" but **"make the mapping a superadmin
setting, seeded from the dictionary, failing closed."**

### C.3 — Core functions (S9)

A core function is one the platform needs to be controlled by the people who control it: managing roles
and permissions is the named example. Core functions:

- ship with the platform, present by default;
- **cannot be deleted** by a user;
- are marked as core on the function record;
- have their own mandatory permissions, themselves created by the S2 default.

**The list of core functions starts with: the roles-and-permissions manager.** The rest is to be filled
in as the platform grows, and every addition to the list is itself a dictionary change.

---

## Part D — Status of enforcement (honest)

| Standard | State | Where it is enforced (or why not) |
|---|---|---|
| S1 change protocol | **PARTIAL** | B2 engine exists and blocks the build; not yet on the AI's change path |
| S2 permissions on change | **PLANNED** | designed in C.1; no guard yet |
| S3 tell the user | **DECLARED** | decided; wording + seal to build |
| S4 data is the gate | **PARTIAL** | per-table + per-column exist; own/team absent; 6 of 67 gated |
| S5 one engine | **DECLARED** | binding on design |
| S6 declared models | **PARTIAL** | per-agent overrides exist; one picture + rule absent |
| S7 chat is a state | **TO REBUILD** | G-21 does the rejected up-front classification |
| S8 notice and suggest | **TO BUILD** | needs history + similarity |
| S9 core functions | **DECLARED** | rule set; flag + delete guard to build |
| S10 standards have homes | **DECLARED** | this table is the implementation |
| S11 structural permissions | **DESIGNED, NOT BUILT** | grammar in `ARCHITECTURE-structure-permissions.md`; plugs onto `MutationGuard` |
| S12 actor type in decisions | **TO BUILD** | needs `actorType` on the guard input |

**Read this honestly: most standards are declared, not yet guarded.** That is the true state. The work
ahead is to move each row from DECLARED or PLANNED to ENFORCED, in the order the backlog sets.

---

## Part E — The two decisions — **both answered by the owner, 2026-10-06**

The owner answered both. Recorded here as **settled**, with his two conditions written into the answer.

**Q1 — C.2's tier mapping — ✅ ACCEPTED, with a condition.**

> *"yes, but has to be mapped to my suggestion that you said it is better fit. So when I choose a tier
> that bulk-apply changes based on my suggestion WHERE NEEDED."*

What this means, written down so it cannot drift:
- The tier mapping (item 17) is accepted **as the default beneath the structural grammar** — it is not a
  rival to S11, it is S11's fallback. One default in the system, not two.
- Tiers are **bulk-applied to the structural permissions**: choosing a tier fills in `(object, verb,
  actorType, level)` where the owner has not set one specifically. A tier choice is a convenience over
  the grammar, not a separate switch beside it.
- Explicit structural settings always win over the tier default. The tier only fills gaps.

**Q2 — S11's structural grammar, when nothing is configured — ✅ FALLBACK ACCEPTED, with a condition.**

> *"Fallback is acceptable if, again, it maps to the standards with default values."*

What this means:
- Where nothing is configured for an object, the request falls back to the **tier table** (Q1).
- That fallback **must carry the standards' default values** — a change whose kind is unrecognised still
  lands on `explicit_approval` (never silent, never "never"), and every fallback pass still emits the
  notice from **S3** and, where unsafe, the suggestion from **S8**. A fallback is a *placement*, not an
  exemption from the standards.

**Q2's two rejection options are now dead.** "Never by default" is out (it would stall the AI on every
new object); "approval by default, always" is out (it is the tier table with extra steps). Fallback-to-
tier, standards-loaded, is the answer.

**Later the same day the owner added a third decision (2026-10-06):** the tiers, the defaults and the
fallbacks must be a **setting a superadmin can change**, not hardcoded. Recorded in **§C.2b** above.
This does not change *what* the defaults are — only *where they live and who may change them*: the
dictionary's table becomes the **seed**, and `module_configs` becomes the **live home**.

Full reasoning for the grammar: [`ARCHITECTURE-structure-permissions.md`](ARCHITECTURE-structure-permissions.md) §7.

---

## Part F — The owner's third instruction: **build order** (answered 2026-10-06)

> *"shouldnt we already build that so we apply the standards as we go instead of stacking other stuff and
> then later on have to edit it after we build this so it work together? … I feel core requirements like
> accounts management, permissions, this, languages, etc… should be the first to build because then you
> build on the top of it. … make sure you fix the order perfectly right so this is not forgotten and push
> 'till later'."*

**Answer: yes. He is right, and the measurement proves he is right.** The full order, its
justification, and the correction to my earlier framing live in
[`BUILD-ORDER.md`](BUILD-ORDER.md). Headline: accounts management is **already built** (auth module,
20+ migrations); permissions **already exist** as a two-table ACL; the structural grammar's socket is
**present and used, but not centrally delivered** — the generated guard registry is **empty in the
running app** (a live defect the critic pass found; `guardEntries: []` in
`apps/mercato/.mercato/generated/guards.generated.ts`), so guards run only through hand-written
per-route calls. So this is **not** "build foundations from scratch" — it is **finish the foundation's
last four gaps before anything is stacked on top**, exactly as he asked: **D0** populate and prove the
generated guard registry, **D1** settings table (rules are code-fixed today), **D2** the deprecated
resolver on the entities path, **D3** the missing `escalate` outcome.

---

*Nothing here is a law of physics. It is the standard we hold ourselves to, written down so it can be
checked, inherited into guards so it cannot be forgotten, and honest about which parts are not yet
guarded. When it is wrong, it changes — deliberately, in writing, here first.*
