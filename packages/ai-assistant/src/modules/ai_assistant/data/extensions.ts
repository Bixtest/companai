import type { EntityExtension } from '@open-mercato/shared/modules/entities'

/**
 * The `Agent`'s `reportsTo` self-edge (`AH-1` §3.1, slice 3 / `CC-40`).
 *
 * **What this is.** `AGENT-HALF.md` §3.1 requires an agent to be *"one flat, legible row with a role and a
 * **real `reportsTo` edge** — no 'type' flag, no separate human/AI shape"*. The kernel expresses a
 * relationship as an `EntityExtension` (`{ base, extension, join, cardinality, description }`), so a
 * reporting line from one agent to another is an edge whose **base and extension are the same entity** —
 * `ai_assistant:agent` → `ai_assistant:agent`.
 *
 * **Why a self-edge is safe (measured, not assumed).** `packages/shared/src/lib/kernel/model.ts:265` reads
 * `if (to !== from) to.relationships.push(relationship)` — the kernel **explicitly handles `from === to`**,
 * pushing a self-edge exactly once instead of double-counting it. So the model carries a real
 * `agent → agent` relationship with no special-casing.
 *
 * **Why this does NOT create a table — and where the `join` is actually read (measured).** The installer
 * (`core/src/modules/entities/lib/install-from-ce.ts`) reads **only `customEntities`** — `grep
 * entityExtensions install-from-ce.ts` finds nothing. So an `EntityExtension` creates **no physical table**
 * and **no migration** (which is why `AH-1` needs no migration). But the `join` keys below are **not
 * inert**: the query engine reads them directly. `shared/src/lib/query/engine.ts:924-937` does
 * `if (opts.includeExtensions) { ... q.leftJoin(extTable, jb.onRef(alias.extensionKey, '=', table.baseKey)) }`
 * — i.e. when a caller sets `includeExtensions`, the engine `LEFT JOIN`s an **extension table** keyed
 * exactly by `join.extensionKey` / `join.baseKey`. Since that table is **not materialised** (no installer
 * path), a caller that set `includeExtensions` for `ai_assistant:agent` would join a missing table.
 *
 * **Why that is dormant today, not a live defect.** No production caller sets `includeExtensions` —
 * `grep includeExtensions` returns only the engine itself (`engine.ts:924/929/930/962`) and its type
 * declaration (`query/types.ts:94`). The flag is therefore **latent**: the trap only arms if a future
 * caller enables extension joins without first materialising the table. Flagged here rather than hidden.
 *
 * **The boundary that must not move.** This declares a kernel **relationship**, not a runtime behaviour. The
 * agent's runtime definition stays code-declared (`ai-agents.ts` → `ai-agents.generated.ts`); nothing here
 * moves an agent definition into the database (the `CC-27` lesson).
 *
 * **The `auth:role` admission (`CC-40`'s remaining half — this slice).** The gap `CC-40` names is precise:
 * the **kernel model has no `role` entity**, so `AH-1` could not honestly make the agent's `role` field a
 * `relation` (a relation *declares* a target the kernel knows). The admin role entity (`auth:role`) is **not**
 * in the model — measured: it is a known id in `entities.ids.generated.ts`, but the descriptor only admits
 * entities through `customEntities` / `customFieldSets` / `entityExtensions`
 * (`shared/src/lib/kernel/model.ts:192-223`), and **nothing declared `auth:role`** (grep: no `base`/`extension`
 * named it). The **same route that admits `auth:user`** is used here: `auth:user` has **no `ce.ts`** either
 * and enters the kernel **only** because `communication_channels/data/extensions.ts:30` names it as an
 * `EntityExtension` end. So the second entry below names **`auth:role`** as an extension end.
 *
 * **What this entry is load-bearing for — stated precisely (a hostile-critic pass corrected an overstatement
 * here).** It fixes **one** thing: the presence of `auth:role` (and `auth:user_role`) **in
 * `buildModelDescriptor`'s entity set**. It does **not** change runtime relation resolution: the
 * relation-options API resolves a target via **MikroORM metadata**
 * (`entities/api/relations/options.ts:66` → `resolveRegisteredEntityTableName(em, entityId)`), and `auth:role`
 * is already a registered MikroORM entity (`auth/data/entities.ts` `Role`) — so it resolved there **with or
 * without** this entry. The two registries are distinct (generated MikroORM entity ids ≠ kernel model), and
 * this change is about the **kernel model** — which is exactly what `CC-40`/`AH-1` name ("the kernel sees it").
 *
 * **Why this shape, and not a fabricated agent edge.** The obvious design — `ai_assistant:agent → auth:role`
 * joined on `agent.role_id` — was **falsified**: there is **no agent table at all** (the agent record is the
 * kernel descriptor + the runtime registry, the `CC-27` lesson; only `ai_agent_*_overrides` tables exist), so
 * **no `agent.role_id` column exists**. Declaring it would invent a column — the exact trap this file's header
 * warns about. Instead the edge is declared on a **real table with a real FK**: `auth:user_role`
 * (`user_roles`: `user_id`, `role_id`, FKs to `users`/`roles` — migration `Migration20251030150038.ts`) points
 * at **`auth:role`**. Both ends are genuine.
 *
 * **What this is NOT.** The `join` here is a real relationship between two real tables; it does **not** assert
 * an agent has a `user_role` row. The agent's `role` field targets the **declared entity id** `auth:role` —
 * that is the whole requirement (`CC-40`). A direct `agent → role` physical edge is deferred, because it would
 * need an agent table that does not exist (its own future item, not this one).
 *
 * Source: `AGENT-HALF.md` §3.1; `PLAN-AH-1.md` §8; `COMPLETION-CALLBACKS.md` `CC-40`.
 */
export const entityExtensions: EntityExtension[] = [
  {
    base: 'ai_assistant:agent',
    extension: 'ai_assistant:agent',
    // A self-edge: an agent reports to another agent (a parent). The parent id is carried on the agent
    // record itself; `baseKey`/`extensionKey` name the two ends of that link. The query engine reads these
    // keys verbatim when `opts.includeExtensions` is set (`query/engine.ts:924-937`) — so they are real,
    // not decorative. No store is materialised from this declaration, and no production caller sets that
    // flag today, so the join is dormant (see the header).
    join: { baseKey: 'id', extensionKey: 'reports_to_id' },
    cardinality: 'many-to-one',
    description:
      'The agent reporting line: an agent reports to a parent agent (AH-1 §3.1 — a real reportsTo edge, no "type" flag).',
  },
  {
    // Admits `auth:role` to the kernel — the entity the agent `role` field (CC-40) needs as its target.
    // Both ends are real: `user_roles` is a table with `user_id`/`role_id` (FKs to `users`/`roles`), and
    // `roles` is a table. This is the same route by which `auth:user` enters the kernel.
    base: 'auth:user_role',
    extension: 'auth:role',
    join: { baseKey: 'role_id', extensionKey: 'id' },
    cardinality: 'many-to-one',
    description:
      'A user-role assignment names the role it grants. Declared so `auth:role` is a first-class kernel entity — the target the agent `role` field (CC-40) needs.',
  },
]

export default entityExtensions
