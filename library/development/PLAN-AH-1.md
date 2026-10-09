# PLAN — `AH-1`: the agent as a kernel object

**Written:** 2026-10-09. **Author:** the agent. **Status:** 🟢 **EXECUTING** (the owner said "proceed").
**Task:** `AH-1` (the only agent-half item on the critical path) — `BACKLOG.md:107`, `BUILD-ORDER.md` item 20,
`platform_points.md` §E, `AGENT-HALF.md` §1.4 + §3.1.
**Parent decisions:** [`DECISION-agent-protection-tier.md`](DECISION-agent-protection-tier.md) (the tier is a
per-object SETTING, owner 2026-10-09); [`DECISION-core-object-set-as-settings.md`](DECISION-core-object-set-as-settings.md)
(the pattern this reuses); `CORE-BOUNDARY.md` §2.

---

## 1. The requirement (definition + platform_points + the decision, combined)

`AGENT-HALF.md` §1.4 defines the fields; §3.1 says it "lands as the `Agent` object in the kernel, extended
with `kind`/`owner`/`actsAs`/`autonomy`". The relevant `platform_points` pull in:

- **E / `AH-1`** — *"The agent as a kernel object: `kind` · `owner` · `actsAs` · `role` · `runtime` ·
  `autonomy`"*.
- **A / `C1`** — the **resource envelope** ("the shape every object shares: id · type · tenant · namespace ·
  version · status · owner · created/updated by · labels · metadata · data"). The agent row must honour it.
- **The owner's 2026-10-09 ruling** — the agent's **protection tier is a per-object setting**, not a blanket
  rule (see the decision doc).

**The requirement in one sentence:** *declare an `Agent` as a first-class kernel object with `kind`,
`owner`, `actsAs`, `role`, `runtime` and `autonomy` fields, so the kernel can see it; and give it a
protection tier that a superadmin sets per object — reusing the engine the tables already use.*

---

## 2. What the code actually is (fact-checked, rule 10d — measured, two routes)

| Question | Answer (measured) |
|---|---|
| Is there an `Agent` **entity**? | **No.** `grep "class Agent"` in `packages/{core,shared}/src` finds none (excluding `runAiAgent*`, `authoring-pack`, tests). |
| Is there an `Agent` **kernel object**? | **No.** `packages/shared/src/lib/kernel/` holds `canonical-id · model · rename · round-trip · from-modules · metadata-registry`; `model.ts` exports only `KernelEntity`/`KernelField`/`KernelRelationship`. |
| How does the kernel learn an object exists? | **Exactly two sources** — `customEntities` (a spec → `ensureEntity`) and `entityExtensions`/`customFieldSets` (`ensureEntity` by `base`/`extension`). There is **no separate "platform entity" list** (`model.ts:192–223`). |
| Where do the *runtime* agents live? | Code-declared: `ai-agents.ts` → `ai-agents.generated.ts`, resolved by `agent-registry.ts` from an **in-memory Map** (`agentsById`, no DB read). **This must NOT change** — `runAiAgent*` reads the Map; a DB-only agent is invisible (the CC-27 lesson). |
| Which module owns the agent concept? | `packages/ai-assistant/src/modules/ai_assistant/` (has `AiAgentPromptOverride`, `AiAgentRuntimeOverride`, `AiAgentMutationPolicyOverride` entities + an `agents` API surface). Its `index.ts` exports `metadata` + `features` but declares **no** `customEntities` today. |
| The guard template for the tier | `packages/core/src/modules/auth/lib/core-object-guard.ts:86,131` — `coreObjectRefusal('role', …, { isCore })` / `coreObjectRenameRefusal(…)`. And `Role` carries `isCore: boolean` (`auth/data/entities.ts:76`). |
| The tier engine | `packages/shared/src/lib/core-boundary/core-settings.ts` — `CORE_TIERS = ['core','platform_release','tenant_structural','tenant_data']`, `resolveCoreTier(kind,id,settings)`, seed + strict parser + fail-closed over `module_configs`, **no migration**. |

**What this means for the plan:** the honest first slice is to **declare `Agent` via `customEntities`** so
`buildModelDescriptor` sees it — the *one* way the kernel admits an object — **without** touching the
code-declared runtime agents. `customEntities` here is the kernel's declaration channel, **not** a claim that
an agent is a tenant ad-hoc record (an agent is a platform capability).

---

## 3. Scope — what lands now, and what is explicitly NOT this task

**Lands now (this plan):**
1. **Slice 1 — declare the `Agent` kernel object.** A `customEntities` declaration carrying the six §1.4
   fields as declared fields, `entityClass: 'CAPABILITY'`. Additive; no table, no migration.
2. **Slice 2 — the agent's protection tier.** Admit `agent` as a `CoreSettingKind` and provide an
   `agentCoreRefusal(kind:'agent', id, …)` path through the **same** `resolveCoreTier` + `coreObjectRefusal`
   engine (S5). Seed: `tenant_data`. No migration (the setting lives in `module_configs`).

**Explicitly NOT this task (scheduled or owned elsewhere):**
- **The runtime binding's *execution*** (`AiRuntimePort` invoke/status/cancel) — that is `L-01`/`AH-5`.
  `AH-1` declares the `runtime` **field**; it does not implement the port.
- **`autonomy` *enforcement*** (the `A0`–`A5` gates at the command bus) — that is **`AH-2`** (needs `G-04`).
  `AH-1` declares the **field** and its per-action-class shape; it does not wire the gate.
- **The AI-user ↔ agent *binding* row** — that is **`CC-27`**, which waits on `AH-1`. Not built here.
- **A physical `agents` table** — **not** part of `AH-1`'s first slice (it would need a migration; see §5).

**Rule 8 note:** anything the slices leave partial (e.g. the field exists but the enforcement is `AH-2`) is
**already tracked** by its own backlog item — so no new callback is owed *unless* a slice stops short in a way
no item covers; if it does, a `CC-` row is added in the same change.

---

## 4. The object shape (the declaration)

`customEntities` spec in `ai_assistant`'s module declaration, with these fields (from §1.4):

| Field | kernel fieldKind | Notes |
|---|---|---|
| `kind` | `select` | `personal · role · context · independent · system` |
| `owner` | `text` | a `User` · a `Role` · the `Organization` · an admin (an id reference) |
| `actsAs` | `text` | a `User` id, or null — **`context` agents only** |
| `role` | `text` | the `Role` id whose permissions the agent carries |
| `runtime` | `text` | the runtime binding name (the `AiRuntimePort` selector) |
| `autonomy` | `text` | per-action-class gate — a declared map/JSON; enforcement is `AH-2` |

Plus the resource-envelope fields the kernel already synthesises, and `accessRestricted: true` (an agent
record is a governance surface — it should require an explicit per-entity grant, matching how roles/keys do).

**The `reportsTo` edge (§3.1: "a real `reportsTo` edge — no 'type' flag").** Declared as an
`entityExtensions` relationship from `agent` → itself/owner is **deferred to a follow-up** if the extension
shape cannot express a self-edge cleanly; recorded honestly in §6 if so. *(Measured below during build.)*

---

## 5. Why no migration, and the alternative that needs one

- **The setting route (chosen).** `module_configs` exists; `setValue`/`restoreDefaults` already write a seed.
  `Agent` as a **kernel declaration** is an in-memory declaration — `getModules()` is an in-memory registry,
  so `collectDeclarations` runs anywhere including a unit test. **No table, no DDL.**
- **The column route (deferred).** Giving an `Agent` *row* its own `isCore` column (the `Role` precedent,
  `auth/data/entities.ts:76`) needs a migration. The host **cannot currently prove a migration** (`CC-31(a)`),
  so this is the **second** slice, scheduled via `CC-31(a)`/a new row only if `AH-1` actually needs a
  physical row (it does not, to be *seen by the kernel*).

---

## 6. Verification (the standard protocols — to run, not to assume)

1. **`tsc --noEmit`** clean in `shared` and `core` (and `ai-assistant` if it type-checks).
2. **Full suites green** — run from **within each package dir** (the Jest rootDir quirk). Expect core
   **637 suites / 5580 tests** baseline + this slice's new tests.
3. **RED-then-GREEN mutation proof** — at least: (M1) remove the `Agent` declaration → the kernel-model test
   that asserts `agent` is a declared entity goes **RED**; (M2) delete the `agent` tier admission → the tier
   test goes **RED**. Each restore **md5-verified** (the encoding trap: byte-writes only).
4. **A separate hostile-critic agent** holding every load-bearing claim, demanding a command+output each.
5. **Docs updated in the same change** (rule 8/9a): `BACKLOG.md`, `BUILD-ORDER.md`, `JOURNAL.md`,
   `platform_points.md` (flip `AH-1`'s `☐`→`☑` **only if** the strict tick rule is met),
   `AGENT-HALF.md` (mark §3.1 landed), `COMPLETION-CALLBACKS.md` (any partial), and the two decisions.
6. **Commit both repos** with explicit paths (never `git add -A`).

---

## 7. Order (so an interruption is resumable)

1. Slice 1 (declare the object) → tests → commit.
2. Slice 2 (the tier) → tests → commit.
3. Verification pass (tsc, suite, mutations, critic).
4. Docs + register, in the same change as the final code commit.

---

## 8. Slice 3 — `CC-40`, the relation upgrade (owner said **"build the possible half now"**, 2026-10-09)

**The requirement (facts measured, not assumed).** `CC-40` says the agent's `owner`/`role`/`actsAs` should be
first-class `relation` fields and a real `reportsTo` self-edge should exist, and that the **prerequisite is the
target entities being declared in the kernel**. That prerequisite is **partially** met — measured by running the
real descriptor inside the deployed image (`collectDeclarations(getModules())` → `buildModelDescriptor`):

```
entity count: 11
  agent present: true   (fields: acts_as, autonomy, kind, owner, role, runtime)
  user  present: true   ← declared via `communication_channels/data/extensions.ts:30` `base: 'auth:user'`
  role  present: false
  organization / tenant: false
```

So, precisely:

| Field | Target | In descriptor? | This slice |
|---|---|---|---|
| `owner` | User | ✅ `user` | **→ `relation` (`relatedEntityId: 'user'`)** |
| `acts_as` | User | ✅ `user` | **→ `relation` (`relatedEntityId: 'user'`)** |
| `role` | Role | ❌ absent | **stays `text`** — no invented target (spec §5.4) |
| `reportsTo` | agent → agent | ✅ `agent` (self) | **→ real `entityExtension` self-edge** |

**Why the self-edge is safe:** `model.ts:265` is `if (to !== from) to.relationships.push(relationship)` — the
kernel **explicitly handles `from === to`**, so an `agent → agent` edge is pushed once, not overflowed.
`'relation'` is a valid `CustomFieldKind` (`entities/kinds.ts:9`) and carries its target via `relatedEntityId`
(`entities.ts`, `CustomFieldDefinition`). All measured.

**Scope of this slice:**
1. In `ce.ts`: `owner` and `acts_as` → `kind: 'relation'`, `relatedEntityId: 'user'`. `role` stays `text` with a
   comment naming `CC-40`'s remaining half.
2. In `ce.ts`: add the `reportsTo` `entityExtension` (base `ai_assistant:agent` → extension `ai_assistant:agent`),
   so the kernel model carries a real self-edge.
3. Extend `ah1-agent-kernel-object.test.ts` to assert: `owner`/`acts_as` have `fieldKind === 'relation'` and
   resolve to `user`; and the model carries a `agent → agent` relationship. A mutation must falsify each.

**What stays open (rule 8):** the `role` **relation** remains deferred — `CC-40` stays OPEN with its callback
unchanged, but its *declared gap narrows* to exactly one field (`role`), which closes when a `role` entity is
declared in the kernel. That narrowing is recorded in `COMPLETION-CALLBACKS.md` in this same change.

**Does this close `AH-1`?** **No.** `AH-1`'s box stays `☐` until *all* its §1.4 fields are relations **and** the
`reportsTo` edge exists. After this slice, one field (`role`) is still `text` — so the box remains `☐` and `CC-40`
remains the open callback, now scoped to `role` alone. Honest, not a tick.

---

## 9. Slices 4+ — the `role` half and BUILD-ORDER item 9, in one channel (owner, 2026-10-09)

This plan's slice 3 (§8) landed the **relation half**. The owner then ruled that the **remaining `role`
half of `CC-40`** and **BUILD-ORDER item 9 (the generic state-machine engine)** should be executed **both,
in an order that leaves no gap** — rather than choosing one and deferring the other. **That work is planned
in a dedicated sub-plan** so this document stays the `AH-1` record and does not grow a second subject:

▶ [`SUB-IMPLEMENTATION-PLAN-CC40-and-item9.md`](SUB-IMPLEMENTATION-PLAN-CC40-and-item9.md)

**The order it sets, in one line:** declare `role` in the kernel → flip `role` `text`→`relation` → extend
the test + mutation → **tick `AH-1` ☐→☑ and close `CC-40`** (unblocking `CC-27`) → **then** build item 9
(so the primitive is stacked on a *finished* agent object — rule 10d). The sub-plan carries the measured
premise-check (no agent table, no `agent.role_id`; the honest admission route is a real `role_id` carrier),
the acceptance per slice, and the rule-8 no-gap guarantee.

### 9b. Stream 1 outcome — `AH-1` is DONE (2026-10-09)

**The four slices are all built and proven; `AH-1` is ticked `☑` and `CC-40` is CLOSED.** Slice 4 admitted
`auth:role` to the kernel (a real `auth:user_role → auth:role` `entityExtensions` edge — the same route that
admits `auth:user`), and `role` is now `kind:'relation', relatedEntityId:'auth:role'`. Proven by the AH-1 test
(**12/12 GREEN**), `ai-assistant` (**103/103 / 1446**), `tsc` clean in `shared`+`core`, **four md5-verified
RED-then-GREEN mutations** (M1 `owner`→text; M2 empty extensions; M3 `role`→text; M4/M5b remove the admission),
and **two hostile-critic rounds** — round 2 caught two defects in *my* claims, both fixed: (a) an assertion
that only read the source constant and passed with the change reverted (now folded into one model-coupled
assertion), and (b) an overstated rationale — the `relatedEntityId` target is consumed by the field-definition
store and the relation-options API, which resolve via **MikroORM metadata, not the kernel model**; so this
admission is load-bearing for the **kernel model** only, and the two registries are now distinguished in the
comments. **Answer to the §6 honesty question** (recorded so it is not re-litigated): `AH-1` owns the
**declaration** of the six fields; the `runtime`/`autonomy` **enforcement** is owned by `L-01`/`AH-5` and
`AH-2` — all three documents state this explicitly, and §3.1's table lists `L-01` as a *sibling item*, not a
dependency. So the tick is honest. **`CC-27` is now unblocked.** Stream 2 (BUILD-ORDER item 9) awaits the
owner's go, per his instruction.
