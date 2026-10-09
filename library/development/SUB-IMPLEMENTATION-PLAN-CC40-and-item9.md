# SUB-IMPLEMENTATION PLAN — closing `CC-40` (the `role` half) **and** BUILD-ORDER item 9, in one channel

**Written:** 2026-10-09
**Author:** the agent (per the owner's instruction, 2026-10-09, verbatim): *"Create a sub-implementation
plan that execute all that so we don't leave gaps behind and move forward — to keep us channelled into the
same critical path intended instead of shifting away. I think this compromise delivers the best of the two
worlds. Then update the journal action section accordingly."*
**Status:** proposed — awaiting the owner's go/no-go (rule 11: the *choice of what to build* is the owner's;
this document is the agent's recommendation, with the facts that make it safe to accept or reject).

**Parent documents.** [`PLAN-AH-1.md`](PLAN-AH-1.md) (the `AH-1` plan; §8 is the slice-3 record);
[`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) (`CC-40`, now narrowed to `role` alone);
[`BUILD-ORDER.md`](BUILD-ORDER.md) item 9; [`AGENT-HALF.md`](AGENT-HALF.md) §3.1;
[`WORKING-RULES.md`](WORKING-RULES.md) (the six-box protocol, rule 8 = schedule every partial, rule 9a =
own the code you touch).

---

## 0. Why this plan exists — the owner's two-objective instruction, resolved

The owner was offered a fork: **(a)** finish `CC-40`'s `role` half — *blocked* until a `role` entity is
declared in the kernel; or **(b)** build **BUILD-ORDER item 9**, the generic state-machine engine —
*unblocked*. The agent recommended **(b)**.

**The owner's call: do neither *instead of* the other — do both, in an order that leaves no gap.** His
reasoning (verbatim intent): *"execute all that so we don't leave gaps behind and move forward … to keep us
channelled into the same critical path intended instead of shifting away. I think this compromise delivers
the best of the two worlds."*

**That is the right instinct, and the measurement says it is also the cheap one** — because the two halves
are **not independent**: `CC-40`'s blocker (no `role` entity in the kernel) turns out to be a **small,
additive declaration**, and doing it *first* means **`AH-1` and `CC-40` both close before item 9 starts** —
so item 9 is then stacked on a *finished* agent object, not an unfinished one (**rule 10d: never stack on an
unfinished foundation**). The compromise therefore **removes** a stack rather than creating one.

**The measured facts that make this safe (each verified this session, not assumed):**

| Fact | How measured | Why it matters |
|---|---|---|
| The auth module has **no `ce.ts`** | `find packages/core/src/modules/auth -name ce.ts` → **empty** | So `auth:user` is admitted **only** as an extension end, not by a `customEntities` declaration. |
| `auth:user` **is** in the kernel **only** because of an `entityExtensions` declaration | `packages/core/src/modules/communication_channels/data/extensions.ts:30` `base: 'auth:user'` | This is the *proven* route by which a non-`ce.ts` entity enters the model. |
| **The mechanism:** any entity named as an extension end is admitted | `shared/src/lib/kernel/model.ts:240-242` — `const from = ensureEntity(extension.base); const to = ensureEntity(extension.extension)` | Declaring an extension whose `base`/`extension` is `auth:role` **puts `role` in the descriptor** — the `CC-40` prerequisite, satisfied the same way `user` was. |
| The `roles` **table and data already exist** | migration `packages/core/src/modules/auth/migrations/Migration20251030150038.ts`; **live DB**: `select count(*) from roles` → **3** (`admin`, `employee`, `superadmin`) | Declaring `role` in the kernel needs **no migration** (it is a *descriptor* admission, not a table). Same as `user`. |
| **No agent table exists** — the agent is a kernel descriptor, not a row | live DB: `information_schema.tables like '%agent%'` → only three `ai_agent_*_overrides` tables; `%` of the agent record itself is **absent** | So there is **no `agent.role_id` column** — `CC-40`'s `role` relation **cannot** be joined on the agent (falsifies "Shape 1"). |
| The only real `role_id` columns live on join tables | live DB: `column_name='role_id'` → `user_roles`, `role_acls`, `role_perspectives`, `role_sidebar_preferences`, `dashboard_role_widgets` | `user_roles` (`user_id`,`role_id`, real FKs) is the honest place to declare the `auth:role` edge. |
| Item 9's precedent is real but narrow | `packages/core/src/modules/customers/` — deal **stage transitions** live in a table + `dealStageTransitionTable.ts` (table-name + missing-table handling), driven from `api/deals/[id]/route.ts` and `commands/deals.ts` | The engine exists **only inside `customers`**; item 9 = **generalise** it, not invent it. |

**The critical-path argument (why this keeps us "channelled").** Both targets are on the **same** path —
`AH-1` is the object every other `AH-` item hangs off, and item 9 is a **core primitive** the agent half
needs for its lifecycle. Doing the `role` half first **closes `AH-1` completely** (its last open leg), which
is what unblocks `CC-27` (the AI-user ↔ agent binding) and the rest of the `AH-` track. Doing item 9 first
instead would build a primitive on an agent object still carrying a known gap. **Order: `role` first, item 9
second — and item 9 starts only after `AH-1`'s box is ticked.** That is the compromise.

---

## 1. The two work-streams, and why this ordering leaves no gap

```
        ┌──────────────────────── WORK-STREAM 1 (small, additive) ────────────────────────┐
        │  A. Declare `role` in the kernel  (the `CC-40` prerequisite)                      │
        │  B. Flip `role` text → relation in `ce.ts`                                        │
        │  C. Extend the AH-1 test; prove with a mutation                                   │
        │  D. Tick `AH-1` ☐→☑ and CLOSE `CC-40` (delete the row, it is no longer partial)   │
        └───────────────────────────────────────────────┬───────────────────────────────────┘
                                                        │  (AH-1 now 100% — no gap to carry)
                                                        ▼
        ┌──────────────────────── WORK-STREAM 2 (the unblocked build) ─────────────────────┐
        │  E. BUILD-ORDER item 9 — generalise the state-machine engine                      │
        │  F. FIRST CALLER: migrate the `customers` deal pipeline onto the generic engine   │
        │  G. Schedule whatever remains (rule 8) rather than leaving it implicit            │
        └───────────────────────────────────────────────────────────────────────────────────┘
```

**Why gap-free by construction:** every slice that cannot be finished in one pass is given a **callback row**
(rule 8) *in the same change*. Nothing is left "noted inside §10".

---

## 2. WORK-STREAM 1 — close `CC-40` (the `role` half) and tick `AH-1`

### Slice 1A — declare `role` as a kernel entity (the prerequisite)

**The requirement.** `CC-40`'s remaining gap is exactly: *`role` is a `text` field because no `role` entity
is in the kernel.* The fix is the **same route `user` took**.

**The change (one file, additive).** In `packages/ai-assistant/src/modules/ai_assistant/data/extensions.ts`,
add a second `EntityExtension` whose ends admit the role entity.

**⚠️ The premise-check was RUN this session, and it settled the shape — Shape 2 is the only honest one:**

1. **Does any agent table carry a `role_id`?** → **No agent table exists at all.** Live DB:
   `select table_name from information_schema.tables where table_name like '%agent%'` → only
   `ai_agent_mutation_policy_overrides`, `ai_agent_prompt_overrides`, `ai_agent_runtime_overrides` — the
   agent **record itself is not a table** (it is the kernel descriptor + the runtime registry; the `CC-27`
   lesson). `select table_name, column_name … where column_name='role_id'` → the column exists only on
   `dashboard_role_widgets`, `role_acls`, `role_perspectives`, `role_sidebar_preferences`, **`user_roles`**.
2. **What does `roles` expose?** → `id, name, tenant_id, created_at, deleted_at, updated_at, is_core` —
   **no `role_id`** (obviously). `user_roles` exposes `id, user_id, role_id, created_at, deleted_at` with
   real FKs to `users(id)` and `roles(id)`.
3. **Does any module already declare `auth:role` as an extension end?** → **No** (grepped all six
   `data/extensions.ts`) — this is genuinely the first, so it must be declared where it is truthful.

**Therefore Shape 1 (`agent → auth:role` joined on `agent.role_id`) is FALSIFIED — it would invent a column
that does not exist**, the exact trap `extensions.ts` now warns about. **The change is Shape 2:** declare the
edge on the table that **does** carry the columns —

```ts
{
  base: 'auth:user',
  extension: 'auth:role',
  join: { baseKey: 'id', extensionKey: 'id' },   // via `user_roles`: user_id -> role_id
  cardinality: 'many-to-many',                    // a user has many roles; a role has many users
  description: 'The staff roles a user holds (via user_roles). Declared so `auth:role` is a first-class
                kernel entity — the target the agent `role` field (CC-40) needs.',
}
```

**Two honesty caveats the author must resolve in this slice (not paper over):**
- **The join keys are subtle.** `base: 'auth:user'` / `extension: 'auth:role'` ends are joined *through*
  `user_roles` (`user_id`↔`role_id`), which a **single** `baseKey`/`extensionKey` pair cannot express
  literally. **Check what the engine actually does with this pair** (`query/engine.ts:924-937` reads
  `e.join.extensionKey`/`e.join.baseKey`) and whether the honest choice is `{ baseKey: 'id', extensionKey:
  'id' }` (ends-as-tables) or whether `auth:role` needs admitting by a **`customEntities`** declaration in a
  module that owns it (**preferred if the auth module can carry a `ce.ts`** — cleaner than a synthetic edge).
- **Property-ownership.** The auth module owns the roles table; **the auth module should own the
  declaration** if it can (`auth/ce.ts` or `auth/data/extensions.ts`). Declaring `auth:role` from
  `ai_assistant`'s file is a **one-way dependency (agent → auth)** only if that direction is already allowed;
  **verify the dependency direction** (`communication_channels/data/extensions.ts` already does hub→auth, so
  the pattern exists — but the *owning* module is the better home). **Decide and record *why*.**

**Acceptance (Slice 1A).** A test (or the existing descriptor probe, run in a scratch dir and deleted —
never committed) shows `buildModelDescriptor(collectDeclarations(getModules())).entities['auth:role']`
**is defined**, and the canonical id the kernel reports is the one `ce.ts` will name (measured, not guessed).

**Acceptance (Slice 1A).** A test (or the existing descriptor probe, run in a scratch dir and deleted —
never committed) shows `buildModelDescriptor(collectDeclarations(getModules())).entities['auth:role']`
**is defined**. A hostile-critic check that the chosen `join` keys name **real** columns or a real table —
not a plausible-looking invention.

### Slice 1B — flip `role` from `text` to `relation`

**The change.** In `packages/ai-assistant/src/modules/ai_assistant/ce.ts`: `role` → `kind: 'relation'`,
`relatedEntityId: 'auth:role'` (or the canonical id the kernel reports — **use the measured id, do not
guess**). Delete the "no `role` entity" paragraph from the field's `description` and the header; replace it
with the truth.

**Acceptance.** The kernel model's `agent` entity carries `role` with `fieldKind === 'relation'`; the
source field carries `kind:'relation'` + the measured `relatedEntityId`.

### Slice 1C — extend the test and prove it with a mutation

**The change.** In `ah1-agent-kernel-object.test.ts`: extend the two-module model build so the **role
entity is genuinely present** (the same non-vacuous discipline that fixed C7), then assert:
- `role` has `fieldKind === 'relation'` in the model;
- the source field's `relatedEntityId` resolves to the **declared** role entity;
- the old "keeps `role` as text" assertion is **replaced** (it now asserts the opposite of the truth).

**Mutation (mandatory — RED then GREEN):** revert `role` to `text` → the new assertions **fail**; restore
→ **GREEN**. Hash-compare the restore (the encoding trap: write bytes, `md5sum` both sides).

**Acceptance.** AH-1 test GREEN; full `ai-assistant` suite GREEN; `tsc --noEmit` clean in `shared` + `core`
(and, if `auth` is touched, `core` again); the mutation falsifies.

### Slice 1D — tick `AH-1` and close `CC-40`

**Only if every acceptance above holds**, and only if the **strict tick rule** is met — i.e. the point *and
everything it depends on* is 100%. After 1A–1C:
- `AH-1`'s six §1.4 fields are **all** real (five relations/text + `runtime`/`autonomy` **declared**, their
  *enforcement* owned by `L-01`/`AH-5` and `AH-2` — **check:** does the tick rule treat the enforcement leg
  as a dependency of `AH-1`, or as a sibling item? **This is the one honesty question to answer from the
  docs before ticking.** If the docs say `AH-1` is "declared here, enforced there", tick it; if they make
  enforcement part of `AH-1`, do **not** tick and keep a narrowed callback).
- If ticked: `platform_points.md` `AH-1` ☐→☑; `BACKLOG.md` `AH-1` `[ ]`→`[x]`; `BUILD-ORDER.md` item 20
  marked done; **`CC-40` is removed from `COMPLETION-CALLBACKS.md`** (a closed callback is deleted, not left
  as a tombstone — *verify the register's own convention first*).
- **Then** (and only then) unblock **`CC-27`** (`A3`): once `AH-1`'s box is `[x]`, `CC-27`'s prerequisite is
  met and the binding row becomes startable.

---

## 3. WORK-STREAM 2 — BUILD-ORDER item 9, the generic state-machine engine

**Starts only after `AH-1` is ticked** (so the primitive is not stacked on an unfinished object).

### Slice 2A — define the engine (a new shared primitive)

**The requirement (BUILD-ORDER §item 9, verbatim):** *"generic state-machine engine (blueprint §10)
promoted to a core primitive: allowed transitions, transition permissions, preconditions, events. Today
pipelines exist only inside `customers`; the blueprint makes lifecycle generic."*

**The change.** A new `packages/shared/src/lib/state-machine/` (mirroring the `user-function/` layout that
`G-03` established): a **declaration type** (states, allowed transitions, per-transition permission,
preconditions, emitted events) and an **enforcement function** (given a declaration + a from/to + an actor,
return *allow* or a **refusal with a value** — the `G-03` lesson: an illegal transition is refused *with a
value*, never silently).

**Acceptance.** Unit-tested in `shared`: a legal transition allowed; an illegal one refused with a reason; a
transition failing its **permission** refused; a transition failing a **precondition** refused; every
transition emits its **event**. A mutation must falsify each branch.

### Slice 2B — the first caller: migrate the `customers` deal pipeline

**The requirement.** A primitive with no caller is unproven (the project's own lesson: *the mechanism without
its first caller*). The **first caller already exists** — the `customers` deal-stage transitions.

**The change.** Route the `customers` deal pipeline through the generic engine, **keeping behaviour
identical** (a characterisation test: the same transitions that were allowed before are allowed after; the
same are refused). **Do not delete the customers code until the generic path is proven equal** — then remove
the duplicate.

**Acceptance.** The existing `customers` transition tests stay GREEN; a new test proves the customers path
*now runs the generic engine* (not a re-implementation); a mutation falsifies that link.

### Slice 2C — schedule what remains (rule 8)

Whatever item 9 cannot finish (e.g. a second caller, a UI surface, a blueprint §10 sub-feature) gets a
**`CC-` row** in `COMPLETION-CALLBACKS.md` with gap + prerequisite + callback — in the same change. Check the
docs for whether item 9 has known sub-parts already scheduled; if so, reconcile rather than duplicate.

---

## 4. Sequencing, dependencies, and the no-gap guarantee

| # | Slice | Depends on | Proves | If it cannot finish |
|---|---|---|---|---|
| 1 | 1A declare `role` | nothing (measured: table + data exist) | `auth:role` in the descriptor | callback: none expected (small, additive) |
| 2 | 1B flip `role` | 1A | `role` is relation-kind in the model | block 1D; keep `CC-40` narrowed |
| 3 | 1C test + mutation | 1B | RED-then-GREEN falsification | do not proceed to 1D |
| 4 | 1D tick `AH-1`, close `CC-40`, unblock `CC-27` | 1C + the honesty check | the box is honestly tickable | keep callback, narrower still |
| 5 | 2A engine | 1D (no stacking) | the primitive enforces all four facets | callback for any unbuilt facet |
| 6 | 2B first caller | 2A | behaviour-preserving migration | keep both paths, schedule the conversion |
| 7 | 2C schedule remains | 2B | nothing lives only in §10 | the rule-8 row *is* the guarantee |

**The rule-8 guarantee, stated once:** *any* slice halted short of 100% produces a `CC-` row **in the same
change** as the halt. That is what makes "we don't leave gaps behind" true by construction rather than by
intention.

**What this plan explicitly does NOT do** (so the scope is honest):
- It does **not** invent a `role` target before measuring the real entity id (spec §5.4).
- It does **not** tick `AH-1` on the `role` half alone if the enforcement leg belongs to `AH-1` (the honesty
  check in 1D decides).
- It does **not** start item 9 before `AH-1` closes (**rule 10d**).
- It does **not** delete the `customers` transition code until the generic path is proven equal.

---

## 5. Verification protocol (every slice, non-negotiable)

Run the project's **standard review + verification** on each slice:
1. **Fact-check first** (rule 10d): confirm what is in the tree, what the prerequisites are, what the change
   can impact — *before* editing.
2. **Implement**, then **hostile-critic as a SEPARATE agent** — demand a command + output for every claim.
3. **RED-then-GREEN mutation** per assertion group; **md5-hash the restore** (the encoding trap: write
   bytes, never `open(p,'w')` on Windows).
4. **Re-measure** the suites (`shared`, `core`, `ai-assistant` as touched) and `tsc --noEmit`.
5. **Docs in the same change** (rule 8/9a): `BACKLOG.md`, `BUILD-ORDER.md`, `platform_points.md`,
   `JOURNAL.md` `▶ NOW`, `COMPLETION-CALLBACKS.md`, the relevant `PLAN-*`/`AGENT-HALF.md` section.
6. **Commit both repos with explicit paths** (never `git add -A`).

---

## 6. The one honesty question to answer before Slice 1D (stated, not hidden)

**Does `AH-1` own the `runtime`/`autonomy` *enforcement*, or only their *declaration*?**

- **If declaration only** (the reading in `PLAN-AH-1.md` §8 and `AGENT-HALF.md` §3.1, and the fact that
  `L-01`/`AH-5` and `AH-2` are named as the owners): then after 1A–1C, **`AH-1` is 100% and must be ticked**.
- **If enforcement is part of `AH-1`:** then `AH-1` is **not** tickable after the `role` half, `CC-40` closes
  but `AH-1` stays `☐` with a **new, named callback** for the enforcement leg, and item 9 still proceeds
  (it does not depend on the enforcement, only on the object).

**The plan resolves this by reading the three documents before Slice 1D** — not by choosing the convenient
reading. The answer is written into `JOURNAL.md` at that moment, with the citation.

---

## 7. Acceptance of the whole plan (the owner's two objectives, checked)

| The owner's objective | Satisfied by | How it is proven |
|---|---|---|
| *"execute all that"* — both halves, not a choice | Work-stream 1 **and** Work-stream 2 | both streams land; 1D closes `CC-40`; 2B proves item 9 with a real caller |
| *"so we don't leave gaps behind"* | the rule-8 guarantee (§4) + the honesty check (§6) | every halt produces a `CC-` row in the same change; `AH-1` is ticked only if honestly tickable |
| *"move forward … the same critical path intended"* | `role` → `AH-1` ✅ → `CC-27` unblocked → item 9 | the ordering in §1; item 9 starts only after `AH-1` closes (rule 10d) |
| *"the best of the two worlds"* | the `role` half is **cheap** (measured: a declaration, no migration) and it **removes** a stack rather than adding one | the §0 measurement table |

---

*Sources of truth: [`BUILD-ORDER.md`](BUILD-ORDER.md) (order) + [`BACKLOG.md`](BACKLOG.md) (status). The live
task lives in the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md) — this plan is
referenced from there and from [`PLAN-AH-1.md`](PLAN-AH-1.md); it does not itself carry "what is next".*
