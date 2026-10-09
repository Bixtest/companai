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
]

export default entityExtensions
