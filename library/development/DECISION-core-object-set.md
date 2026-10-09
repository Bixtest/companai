# The core object set — what else is "core" beyond the roles-and-permissions manager

**Written:** 2026-10-09. **Author:** the agent. **Status:** 🟡 **PROPOSAL — awaiting the owner's ruling.**
**Parent:** `SD-2` / `S9` (dictionary §C.3), `CORE-BOUNDARY.md` §1–§5, `COMPLETION-CALLBACKS.md` **CC-31(b)**.

> **Why this document exists.** `SD-2` built the mechanism (a core object ships by default and **cannot be
> deleted by anyone**) and one entry, the built-in `superadmin` role. The dictionary says the list *"starts
> with: the roles-and-permissions manager"* and *"every addition to the list is itself a dictionary
> change"*. **Adding the rest is the owner's ruling, not mine (rule 11).** This document is the evidence
> for that ruling — measured, not asserted.

---

## 0. The one correction that matters most (the owner's own point)

The owner said: *"it is important to look at core architecture from the **database** side as well (which is
even more important). In a platform where users can customize database, there are tables/columns/relationships
that should not be editable because they are the backbone of the schema and editing it can crash the system."*

**That is correct, and it is a DIFFERENT axis from the one `SD-2` built.** There are two distinct ways a
"core object" can be harmed, and they need two different guards:

| # | The harm | The vector | Who can do it today | Guarded by |
|---|---|---|---|---|
| **A** | **An object is deleted** — the `superadmin` role, a control surface | a `DELETE` on a **row** | an actor with the manage permission | **`SD-2` — BUILT** (row-level, actor-independent, every delete path) |
| **B** | **The schema's backbone is changed** — a system table dropped, a system column removed/re-typed, a relation broken | a **structural** change (DDL) | the **customization UI / the S2 structure gate / a Hermes-proposed change** | **NOT built as a core-object rule** — see §3 |

**`SD-2` answered A. The owner is asking about B.** They are not the same guard and B is the more dangerous
one, because B can take the *entire database* down while A takes one surface down. This document is mostly
about B.

---

## 1. What "core" already means in this codebase — three existing lists, none of them a core-object registry

Measured this session. **Three** prior art sets exist, and each answers a *narrower* question than
"may this be changed at all":

| Set | File | Size | The question it answers | Not the same as |
|---|---|---|---|---|
| **Reserved system entity types** | `shared/src/lib/entities/system-entities.ts` | **7** ids | *"may this appear in the entity-type **picker**?"* | **UI selectability** — deleting the table is still possible |
| **Reserved record keys** | `core/.../entities/data/guards.ts:69` | **7** keys | *"may a **custom field** claim this column?"* | **column-name collision** on a record |
| **ORM-backed system entity** | `shared/src/lib/data/engine.ts:165` (`isOrmBackedSystemEntityId`) | **dynamic** (112 ids) | *"is this a **module table** (so records live in its own table, not doc storage)?"* | **doc-storage routing** — the deepest existing seam |

**The honest reading:** the codebase already has a fine-grained vocabulary for *three* narrower questions,
and **none of them is "this table/column is the backbone and its structure may not change."** That is the
gap. The good news: the third list — `isOrmBackedSystemEntityId` — is already **the right seam to extend**,
because it is the one place that resolves *"is this entity id backed by a real ORM table?"* and it is already
the choke point the record path consults.

---

## 2. The measured surface (live PG 17, database `open-mercato`)

- **143 tables**, **112 ORM entity definitions** — the runtime registry (`apps/mercato/.mercato/generated/entities/`).
- **Populated now (starter data):** `tenants` 1 · `organizations` 1 · `users` 3 · `roles` 3 · `role_acls` 3 · `user_roles` 3. Custom tables empty (`custom_entities` 0, `custom_field_defs` 0) — nothing a tenant can break yet, which is exactly why this is the right moment to decide.

**Entities fall into four families by whether a tenant may restructure them:**

| Family | Example tables | May a tenant change its *shape*? | Why |
|---|---|---|---|
| **§A Backbone (the platform's own machinery)** | `tenants`, `organizations`, `users`, `roles`, `role_acls`, `user_roles`, `sessions`, `api_keys`, `action_logs`, `audit_logs`, `custom_entities`, `custom_field_defs`, `entity_indexes`, `module_configs` | **NO — never** | the permission engine, identity, tenancy, audit and the customization substrate itself read these. Changing them is the `CORE-BOUNDARY` §2 collapse |
| **§B Business data (rows a tenant owns)** | `customers`, `catalog`, `sales`, `wms`, `staff` | rows yes; **shape only through the S2 gate** | a tenant *may* add a field; the gate forces the permissions question first |
| **§C Configuration (rows = settings)** | `module_configs`, `feature_toggles`, `dictionaries`, `business_rules` | rows yes (Ring 2) | configurable by design (`SD-3`) |
| **§D Platform packs (Ring 3)** | `workflows`, `messages`, `notifications`, … | replaceable as packs | not core |

**The ruling needed is which tables are §A.** §2 rows, columns **and relations** of §A are the ones the owner
means by *"the backbone of the schema"*.

---

## 3. What is NOT protected today (measured) — the real hole

The S2 structure gate (`SD-1`) gates **creates** (a new surface must be decided). It does **not** gate:

1. **A DROP / a schema change to an existing system table.** `SD-1` answers *"a new surface appeared"*; nothing answers *"an existing backbone table was removed or re-typed."*
2. **A custom field attached to a system table** — this **is** blocked, but by the *UI-selectability* list (`definitions.ts:505` → `isSystemEntitySelectable`), which covers **7** ids only. A system table **not** in those 7 (`users`, `roles`, `tenants`, `sessions`…) is **selectable** — so a custom field can be attached to it. **`roles`/`users`/`tenants` are not in the 7.**
3. **A relation (foreign key) broken** — no rule covers it at all.

> **This is the concrete, measured hole the owner's instinct names.** It is a **real gap**, not a stylistic
> one, and it is **not** closed by `SD-2` (which is row-level) nor fully by `SD-1` (which is create-only).

---

## 4. The recommendation

**Three tiers, one mechanism.** Extend the core-object registry `SD-2` already built
(`shared/src/lib/core-boundary/core-objects.ts`) so a "core object" can be of kind **`role`**
(**built**), **`table`**, **`column`**, or **`relation`** — and enforce the same rule
(*nobody may remove or restructure it*) on the structural path, reusing `SD-1`'s gate shape (S5: one engine).

### Tier 1 — RECOMMENDED CORE NOW (the ones whose loss crashes the platform)

These are the tables the platform **cannot describe itself without** (`CORE-BOUNDARY.md` §0 test: *"could the
platform stop being able to describe itself?"* → yes). **Recommended: core = un-droppable, un-re-typable,
un-re-nameable; columns un-removable; their relations fixed.**

| Table | Ring-1 item it serves | Why its loss is fatal |
|---|---|---|
| `tenants` | C3 tenancy | every row's tenant scope dies — multi-tenancy is gone |
| `organizations` / `organization_edges` | C3 tenancy, org tree | scoping and the org hierarchy collapse |
| `users` / `user_roles` / `user_acls` | C2 actor, C4 authz | nobody can be identified or authorised |
| `roles` / `role_acls` | C4 authz engine | every permission grant loses its home |
| `sessions` / `password_resets` / `api_keys` | C2 actor, auth | authentication and the AI principal break |
| `action_logs` / `access_logs` | C8 audit contract | audit is a legal duty; a broken audit is no audit |
| `custom_entities` / `custom_entities_storage` / `custom_field_defs` / `custom_field_values` / `custom_field_entity_configs` | C5 metadata registry | **the customization substrate itself** — remove it and no tenant can customize anything (and it is what `SD-1` writes to) |
| `entity_indexes` / `entity_index_coverage` / `entity_index_jobs` / `search_tokens` | C5 metadata registry | search and index routing die |
| `module_configs` | C5 + `SD-3` | the tier/defaults settings lose their store |
| `mikro_orm_migrations_*` | C9 migration contract | **the migration ledger** — lose it and `db:migrate` re-runs or refuses |

### Tier 2 — RECOMMENDED: core by DEFAULT, overridable only by a platform release

The platform's **own control surfaces and process machinery** — losing one degrades a feature, not the
system: `authority_*` (the decision layer), `role_acls` consumers like `perspectives` /
`sidebar_variants`, `feature_toggles`, `webhooks` / `webhook_deliveries`, `scheduled_jobs`,
`workflow_definitions`, `record_locks`, `encryption_maps`.

**Recommendation:** mark these core **but** keep the door a platform release (`CORE-BOUNDARY` §2 change rule) —
so they are protected from users, not from us.

### Tier 3 — NOT core (business data, packs) — leave to `SD-1` + `SD-4`

`customers`, `catalog`, `sales`, `wms`, `staff`, `planner`, … → **not** core objects. Their **shape** is
already governed by the S2 gate (`SD-1`) and the structural grammar (`SD-4`). Marking them core would be
wrong — a tenant *must* be able to add a field to a customer.

### The columns and relations rule (the part `SD-2`/`SD-1` do not cover)

For a Tier-1 table, additionally: **its system columns** (`id`, `tenant_id`, `organization_id`,
`created_at`, `updated_at`, `deleted_at` — the `RESERVED_RECORD_KEYS` set already exists) are **un-removable
and un-re-typable**, and **its foreign keys are fixed**. This is one rule applied to a known column set,
not a per-column list.

---

## 5. What implementing the ruling would take (so the cost is visible before you decide)

Nothing here is built yet; the honest sizing:

1. **Widen the registry** — `CORE_OBJECT_KINDS` gains `table` / `column` / `relation`; `CORE_OBJECTS` gains the Tier‑1 rows. **Small** (the `SD-2` shape already fits; the existing tests extend).
2. **One structural guard** — a `MutationGuard` on the schema-change path reading the registry (the `SD-1` gate shape). **Medium** — it needs the structural-change path to carry *which* table/column, which is the same plumbing `SD-1` built for creates.
3. **Widen `isSystemEntitySelectable`** — the 7-id list becomes the Tier‑1/Tier‑2 table list, so the *custom-field-on-a-system-table* hole (§3.2) closes as a consequence. **Small.**
4. **A migration is not needed** if the list lives in code (the `SD-2` decision); a **column** would need one (deferred, `CC-31(a)`).

**Recommendation on sequencing:** do (1) and (3) **now** (they close a measured hole and cost little);
schedule (2) with `SD-4`'s structural grammar, because *"nobody may restructure a core table"* is a rule of
that grammar and building it twice would violate S5.

---

## 6. What I need from you (one ruling, three words)

> **You do not need to read anything else. Answer with these three lines.**

1. **Tier 1** — the ~25 tables in §4 marked **RECOMMENDED CORE NOW**: **accept / trim** (say which to drop).
2. **Tier 2** — core-by-default-but-platform-releasable: **accept / drop**.
3. **The columns-and-relations rule** for Tier‑1 tables (system columns un-removable; FKs fixed): **accept / change**.

**My recommendation:** **accept all three** — with the amendment that Tier‑1 membership is written in
**code** (as `SD-2` already does) so no migration is needed, and that a future migration may move it to a
column (`CC-31(a)`).

**Nothing is blocked on this.** `SD-2` ships the mechanism; this ruling only fills the list. Until you rule,
the registry is honestly **one entry deep** and says so.
