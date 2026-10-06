# The structure-change permission grammar — what the AI may do, to what, to what level

**Why this document exists.** On 2026-10-06 the owner proposed a better shape for the change-permission
question than the one the specifications dictionary had set. His words: now that every database column
carries a permission, add a **second settings block** (`premium_permissions`) that answers *the structural
question*, not the read/write question — "for this table, can we add/edit/delete columns (each a separate
permission); can the AI do it straight, or does it need review, or approval; can this role approve it; can
this column be used as a reference; can the AI create a new table, a relationship table, and so on." Then
manage it with a roles-and-permissions-style module keyed on **user role, actor type (AI/human), and
permission**.

This document measures that idea against the platform and answers honestly: **is it better than what item
17 set, or not.**

**Verdict up front.** **It is better — materially.** It is better because it is **finer-grained** (per
object, per operation, per level rather than one tier per change *kind*), it is **uniform** (structural
permissions become the same *shape* as data permissions, so there is one mental model not two), and it is
**already housed**: the platform has a generic mutation guard that takes a resource kind, an operation and
an actor, and can block — which is exactly the socket this idea plugs into. Item 17's tier table survives,
but it **demotes from the mechanism to a default**: the tier is what you get when no explicit
premium-permission is set.

---

## 1. What already exists (measured, not assumed)

Three pieces, all real today:

**1.1 Columns and entities are already governable resources.** In
`packages/core/src/modules/entities/api/definitions.mutation-guard.ts`:

```ts
export const ENTITY_DEFINITION_RESOURCE_KIND = 'entities.entity'
export const FIELD_DEFINITION_RESOURCE_KIND = 'entities.field_definition'
```

So "a table" and "a single column" are **already named resource kinds** passed to a guard. This is the
substrate the owner's idea needs, and it is not hypothetical.

**1.2 A column is already a row, not an anonymous field.** `custom_field_defs` (`core/.../entities/data/entities.ts`)
stores one row per field with `entity_id`, `key`, `kind`, `config_json`, `is_active`. So "every column has
its own settings" is **already true for custom fields** — the settings block the owner describes is a new
column on a structure that exists, not a new structure.

**1.3 A generic guard already decides, per resource and operation.** The modern registry
(`shared/src/lib/crud/mutation-guard-registry.ts`) defines:

```ts
export interface MutationGuard {
  id: string
  targetEntity: string | '*'                       // or one specific object
  operations: ('create' | 'update' | 'delete')[]   // add / edit / remove
  features?: string[]                              // gated by the actor's permissions
  validate(input): Promise<MutationGuardResult>    // ok:false blocks, with a message
}
```

This is the owner's idea, minus the naming. A guard that says *"the AI may add a column to this table, but
only after approval"* is a guard with `operations:['create']`, a feature requirement, and a `validate()`
that returns `ok:false` with a "needs approval" message — or, more precisely, the guard's result grows a
third outcome beyond allow/deny: **escalate**.

**What does NOT exist:** the second settings block itself (`premium_permissions`), the **escalate**
outcome (the guard today is binary: allow or block), and the actor-type axis (human vs AI as a first-class
input to the decision).

---

## 2. The analysis the owner asked for — what can the AI actually do?

The owner asked to "fully analyze what is possible to be done by AI". Structurally, every AI action is a
**verb on an object**. Enumerating the verbs and objects is what makes the permissions finite and
manageable. Here is the complete set for structural change:

### The objects

| Object | What it is | Already exists? |
|---|---|---|
| **Table** | an entity | ✅ `entities.entity` |
| **Column** | a field on a table | ✅ `entities.field_definition` + `custom_field_defs` |
| **Relation** | a link between two tables | ✅ (kernel relationships, G-01) |
| **Function** | a saved operation | ✅ user-function module |
| **Widget** | a placed view of a Function | ✅ business-widget module |
| **Agent** | an AI worker | ✅ (agent half, AH-1) |
| **Model binding** | which model a job uses | ✅ (per-agent overrides) |

### The verbs, per object

| Verb | On a table | On a column | On a relation | On a function |
|---|---|---|---|---|
| **Read / see** | see it exists | see its value | see the link | run it |
| **Add (create)** | create a table | add a column | create a link | save a function |
| **Edit** | rename, add index | change type | re-type | edit the steps |
| **Remove (delete)** | drop a table | drop a column | remove the link | delete it |
| **Reference** | use as a join target | use in another table's relation | use in a query | call it from another |

*(That last row — "reference" — is the owner's own insight, and it is the one everyone forgets. A column
can be harmless to add and dangerous to let others reference. It earns its own permission.)*

### The levels a verb can be permitted at

| Level | Meaning | Map to existing tier |
|---|---|---|
| **straight** | the AI may do it; it happens | `safe` |
| **review** | the AI may do it, but it is checked before it takes effect | `review_required` |
| **approval** | the AI may propose it; a named person must approve | `explicit_approval` |
| **never** | not permitted at this actor/permission | (no tier) |

So the full grammar is: **(actor type, actor role, verb, object, level)**. Example: *(AI, "data-modeller",
add, column, review)*. That is one settings row. The number of rows is finite — roughly (verbs × objects ×
levels) — and each one is a clear sentence.

---

## 3. Why this is better than what item 17 set

**Item 17 set:** one tier per **kind of change** ("add an optional column" → review). A lookup table,
keyed on the change's description.

**The owner's idea:** a level per **(object, verb, actor)**.

| | Item 17 (set) | Owner's idea | Who wins |
|---|---|---|---|
| **Granularity** | per change kind | per object × verb × actor | **owner** — "AI may add columns but not drop them" is expressible |
| **Uniformity** | its own scheme | same shape as data permissions | **owner** — one mental model, not two |
| **Actor type** | not considered | human vs AI is a first-class axis | **owner** — the whole point |
| **Escalation** | a tier already chosen | a level the guard can raise | **owner** — "review" vs "approval" is per-case |
| **Where it lives** | one table in one file | settings on the object + guards | **owner** — travels with the object |
| **Cost** | near-zero (a table) | higher: needs the settings block, the escalate outcome, the actor axis | **item 17** |
| **Fails closed** | yes (unknown → strictest) | must be built to | tie |

**The honest cost.** Item 17 is nearly free — it is one table. The owner's idea is real work: a settings
block, a third guard outcome (escalate), the actor-type input, and the UI to set it all per object. It is
better, and it costs more. That is the trade, stated plainly.

**How they combine — and this is the recommendation.** They are not rivals. Keep **both**, with the layer
order:

1. **The premium-permission settings** are the **specific rule** ("the AI may add a column here, as
   review"). When set, they decide.
2. **Item 17's tier table** is the **default** when nothing specific is set ("no premium-permission on
   this object → fall back to the kind's tier").
3. **Both fail closed** — an object with no setting and an unrecognised kind land in the strictest level.

That way the fine-grained idea is the mechanism, item 17 is the safety net beneath it, and neither is
thrown away.

---

## 4. The proposed architecture

### 4.1 The grammar

```
StructurePermission {
  object: 'table' | 'column' | 'relation' | 'function' | 'widget' | 'agent'
  verb:   'read' | 'add' | 'edit' | 'remove' | 'reference'
  actorType: 'human' | 'ai' | 'any'
  role:   <role id, or '*' for any>
  level:  'straight' | 'review' | 'approval' | 'never'
}
```

Each is a row. The set of rows for one object is its **structural permission block** — the
`premium_permissions` the owner named.

### 4.2 Where it plugs in — no new engine (S5)

Onto the **existing `MutationGuard`**, which already takes `resourceKind` + `operation` + actor:

- `operation` maps to `verb` (create→add, update→edit, delete→remove).
- `resourceKind` maps to `object` (`entities.field_definition` → column, etc.).
- The guard gains **`actorType`** on its input (AI vs human — the AI path already knows it is the AI path).
- `MutationGuardResult` gains a third outcome: **`escalate`** (today it is only ok / block). `escalate`
  with a level of *review* routes to review; *approval* routes to the pending-approval mechanism that
  **already exists** in the platform (the AI pending-action approval card, and the authority
  `authority_pending_acts` table).

**So the whole idea is: two new inputs (actor type, level), one new outcome (escalate), one settings
block — onto an engine that exists.** That is why it is affordable, and it is why S5 (one engine) is kept.

### 4.3 The reference permission (the owner's "can we use this column as a reference")

This deserves its own note because it is the sharpest part of the idea. A column that is *added* is
harmless; a column that others are *allowed to reference* becomes part of the schema's public surface — a
change to it now breaks dependents. So:

- `reference` is a verb with its own level, per column and per table.
- It connects directly to **G-10** (dependency tracking) and the kernel's `rename.ts` (`clean` vs
  `requires_recompilation`): a column marked `never`-referencable is private detail; a column marked
  `straight`-referencable is public API. **The rename planner already tells you which is which** — this
  makes it enforceable, not just reported.

### 4.4 The manage surface

The owner's "roles and permissions similar module" is the **settings screen over the structural
permission block** — grouped by object, showing each verb × actor × level as a set of choices. It reuses
the roles UI's shape, and it reads the same `features_json`-style grant mechanism the platform already
uses for data permissions (so it is the same engine, S5).

---

## 5. What this changes in the specifications dictionary

If accepted, two clauses are added and one is amended:

- **New S11 — structural permissions are explicit, per object and verb, and inherited by default.** Every
  governable object carries a structural permission block; an unset entry falls back to item 17's tier;
  both fail closed.
- **New S12 — the actor type is part of every structural decision.** A rule may say what *AI* may do
  and what a *human* may do, separately. Neither is inferred from the other.
- **Amended S2** — the permissions-on-change gate now installs **both** blocks when a new object appears:
  the data permission (who may read/write the values) **and** the structural permission (who may add/edit/
  remove/reference the object). A new column is not "permitted" until both are set.
- **Amended C.2 / item 17** — the tier table is demoted from *the mechanism* to *the default under the
  mechanism*.

---

## 6. Status

| # | Point | Status |
|---|---|---|
| 1 | Table + column are already resource kinds (`entities.entity`, `entities.field_definition`) | **EXISTS — measured** |
| 2 | A column is already a row with settings (`custom_field_defs`) | **EXISTS — measured** |
| 3 | A generic per-resource guard that can block exists (`MutationGuard`) | **EXISTS — measured** |
| 4 | The `premium_permissions` settings block | **TO BUILD — D1** (dictionary §C.2b; backlog SD-3/SD-4) |
| 5 | The `escalate` outcome (review vs approval) | **TO BUILD — D3** (pending-approval machinery exists) |
| 6 | The actor-type axis (human vs AI) | **TO BUILD** (lands with D1/D3) |
| 7 | The grammar (object × verb × level) | **DESIGNED — this document** |
| 8 | The manage screen | **TO BUILD — SD-5** (after SD-4) |
| 9 | Item 17's tier table | **KEEP as the default under the mechanism** — the owner's Q2 answer (§7) |
| 10 | The registry delivering guards at all (D0) | **BUILT and PROVEN 2026-10-06** (`d225602`) — §2c of the build order. Previously the generated registry was **empty**, so no structured guard ran |

**What is built:** the engine and its substrate (points 1–3), and — since 2026-10-06 — the registry actually
**delivering** guards from an enabled module (D0, point 10). **What is not built: the settings block
(point 4 / D1), the escalate outcome (point 5 / D3), the actor-type axis (point 6) and the manage screen
(point 8).** This document remains the analysis and the recommendation; the decisions in §7 and the
dictionary's Part E are now **settled**, so D1/D3 can be built against them.

---

## 7. The one open point for the owner — **ANSWERED 2026-10-06**

**When a structural action is asked for and NO premium-permission has been set for that object yet — what
should happen?**

- [ ] Never by default — an unset structural permission means *not permitted*; someone must set it first.
- [ ] Approval by default — an unset permission means *allowed, but a person approves each time*.
- [x] **Fall back to item 17's tier table** — the kind of change decides. **✅ CHOSEN by the owner,
      2026-10-06, with a condition.**

His answer, verbatim: *"Fallback is acceptable if, again, it maps to the standards with default values."*

What that means, written down so it cannot drift (`SPECIFICATIONS-DICTIONARY.md` Part E, Q2):
- The first two options are **dead**. "Never by default" is out (it would stall the AI on every new
  object); "approval by default, always" is out (it is the tier table with extra steps).
- Where nothing is configured for an object, the request falls back to the **tier table**.
- The fallback **must carry the standards' default values**: an unrecognised change kind still lands on
  `explicit_approval` (never silent, never "never"), and a fallback pass still emits the S3 notice and,
  where unsafe, the S8 suggestion. A fallback is a *placement*, not an exemption.
- The tiers themselves are a **superadmin setting** (`module_configs`, module `request_outcome`, name
  `structureChangeTiers`), seeded from the dictionary's table, failing closed if missing —
  dictionary §C.2b, backlog SD-3, build-order **D1**.

**This resolved together with the dictionary's Part E Q2**, exactly as predicted — one default in the
system (the tier table), not two.
