# The core object set — as SETTINGS a superadmin manages, not a hardcoded list

**Written:** 2026-10-09. **Author:** the agent. **Status:** 🟡 **PROPOSAL — awaiting the owner's go-ahead.**
**Supersedes:** the "written in code" recommendation in [`DECISION-core-object-set.md`](DECISION-core-object-set.md) §4/§5.
**Parent:** `SD-2`/`S9` (dictionary §C.3), **`SD-3`/`D1` + dictionary §C.2b (the precedent this copies)**,
`CORE-BOUNDARY.md` §2/§5, `COMPLETION-CALLBACKS.md` CC-31, `NEEDS-YOU.md` row `G-17`.

> **The owner's instruction (2026-10-09).** *"we follow your recommendations concerning that. However,
> analyze if we can do this as a manageable matter instead of hardcoded. Give the superadmin the right and
> functionality to identify which table/column/function belongs to which tier. This way if in the future the
> superadmin added a column that should not be deleted, he can set that from the superadmin UI without
> editing code. So, your recommendations become **default settings**, not hardcoded architecture."*

---

## 0. Answer: yes — and the platform already contains the exact pattern to copy

**It can be done, it is not a new mechanism, and it is the *right* shape.** `SD-3` did precisely this one
turn earlier, for the *tier mapping*: the owner said *"let's not make it hardcoded but a setting a superadmin
can change"*, and it shipped as a **seed + a strict reader + a fail-closed parser + the platform's existing
`module_configs` store** — mutation-proven and hostile-criticised.

**The core-object set is the same shape of problem**, so it copies the same solution. The owner's instinct
also fixes a real defect in my earlier recommendation: writing the ~25 tables into code would have meant a
**deploy to protect a table the superadmin had just created** — which is obviously wrong for a
customizable platform.

**The one thing that must NOT become a setting** (and the owner's own wording already respects it): *the rule
that core objects cannot be deleted or restructured*. That is the **engine**, and `CORE-BOUNDARY.md` §2 makes
it **Ring 1** — platform release only. In the owner's words: *"your recommendations become default settings"* —
the **values** are settings, the **rule** stays. That is not a contradiction; it is the Ring‑1/Ring‑2
asymmetry the boundary document already states (`CORE-BOUNDARY.md` §2: *"the values are configurable; the
engine that reads them, and the rule that it fails closed, are Ring 1"*).

---

## 1. The precedent, measured (why this is a copy, not an invention)

`shared/src/lib/request-outcome/tier-source.ts` (SD‑3, **BUILT 2026‑10‑06**) is the template. Its five parts:

| Part | In `tier-source.ts` | What the core-set setting copies |
|---|---|---|
| **Where it lives** | `module_configs`, module `request_outcome`, name `structureChangeTiers` | `module_configs`, module `core_boundary`, name `coreObjectTiers` |
| **The seed** | `DEFAULT_TIER_SETTINGS` — frozen, and a test asserts it fails closed | `DEFAULT_CORE_SETTINGS` — the ~25 Tier‑1 + Tier‑2 tables from the recommendation |
| **The strict parser** | `parseTierSettings(raw): TierSettings \| null` — one bad row invalidates the whole setting | `parseCoreSettings(raw): CoreSettings \| null` — same strictness |
| **The pure decision** | `resolveTier(kind, settings)` — no await, no DB, own-keys only | `resolveCoreTier(kind, id, settings)` — same contract |
| **The async read** | `loadTierSettings(reader, scope)` — never throws; falls back to the seed | `loadCoreSettings(reader, scope)` — same |

**The store and API already exist and need nothing new** (dictionary §C.2b says so, and I re-verified it):
`ModuleConfigService` has `getValue`, `setValue`, `restoreDefaults` (which already writes a seed), `invalidate`,
and resolution *tenant row → instance row → supplied default* — plus two partial unique indexes on
`(module_id, name)` for the global and scoped rows. **S5 (one engine, never a rival) is satisfied by
construction.**

---

## 2. The design — what is a setting, and what is not

### 2.1 What becomes a SETTING (editable per instance, and per tenant where it makes sense)

| # | Setting | Shape | Who may change | Fails closed to |
|---|---|---|---|---|
| **1** | **The object→tier map** | `{ [kind]: { [id]: tier } }` where `kind ∈ table\|column\|relation\|function\|role` and `tier ∈ core\|platform_release\|tenant_structural\|tenant_data` | superadmin (Ring‑2) | the **seed** (the strictest tier present for an unknown object) |
| **2** | **The default tier** for an object not in the map | one value | superadmin | `tenant_structural` (an unknown object is **not** silently core, and **not** silently free — it goes to the S2 gate, which fails closed on its own) |
| **3** | **The system-column set** (the column names never allowed as custom-field keys, un-removable on Tier‑1 tables) | `string[]` | superadmin | the current 7 (`id`, `tenant_id`, `organization_id`, `created_at`, `updated_at`, `deleted_at`, + camelCase) |
| **4** | **The reserved entity types** (the picker's exclusion list — the 7 ids today) | `string[]` | superadmin | the current 7 (measured in `system-entities.ts`) |

### 2.2 What stays CODE (Ring 1 — the engine, per `CORE-BOUNDARY.md` §2)

- **The rule** — *a `core` object cannot be deleted or restructured, by anyone.* (The `SD-2` registry's contract.)
- **The four tier names and their meanings.** Adding a fifth tier is a dictionary change, not a setting.
- **The fail-closed parser.** A malformed setting must never soften the platform — the same guardrail §C.2b fixes.
- **The enforcement sites** — the `SD-2` delete guard and (scheduled) the structural guard.

> **This split is the answer to the owner's question.** The superadmin gets the *right and the functionality*
> to say *"this table is core"*; they do **not** get the ability to say *"core objects may be deleted"*. A
> setting can move an object **between** tiers; it can never **delete the tiers**.

### 2.3 The four tiers (the vocabulary the setting stores)

Reusing `CORE-BOUNDARY.md`'s own ring language so the setting and the boundary document cannot drift:

| Tier | Means | Enforced by |
|---|---|---|
| **`core`** | Ring 1. Un-droppable, un-re-typable, columns un-removable, FKs fixed. Nobody — platform release only | the core guard (delete + structural) |
| **`platform_release`** | Protected from users; changeable by a platform release (my earlier "Tier 2") | the core guard, with a platform-release bypass |
| **`tenant_structural`** | A tenant may change its **shape**, but only through the S2 gate (`SD-1`) + the grammar (`SD-4`) | the S2 gate (already built) |
| **`tenant_data`** | A tenant owns the **rows**; shape unchanged | ordinary RBAC |

**My earlier Tier‑1 recommendation = the seed's `core` rows. My earlier Tier‑2 = the seed's
`platform_release` rows. My earlier "Tier 3 — not core" = the **absence** of a row, which resolves to the
default `tenant_structural`.** So the recommendation is preserved exactly — as the seed, not as code.

---

## 3. The manage screen (the "superadmin UI" the owner asked for)

**Honest note:** `SD-3`'s own setting **has no UI yet** — measured this session: the only writer is
`configs/cli.ts`, and `BACKLOG` lists the manage screen as still open. So the UI for the core set should be
built **with** `SD-5` (the structural-permission manage screen), which is the *same shape* of surface —
grouped by object, each with a choice. **One surface, two settings** — not two UIs.

**What it needs:** list every object the metadata registry knows (the 112 entity ids + their columns +
relations), show the current tier, and let a superadmin change it. `SD-4`/`SD-5` already own the
"per object × verb × level" grid; this adds a **per-object tier** column to the same grid.

**The write path is already correct and audited:** `setValue` → `module_configs` → and per dictionary §C.2b
*"it is itself a gated change… recorded, not silent"* — so changing a tier is a structural change and goes
through the S2 gate like any other. **No new audit machinery.**

---

## 4. What this costs (honest sizing)

| Step | Size | When |
|---|---|---|
| `shared/src/lib/core-boundary/core-settings.ts` — seed + parser + pure decision + reader (a **direct copy** of `tier-source.ts`'s shape) | **Small** | now |
| Switch `SD-2`'s `core-objects.ts` from its frozen list to `resolveCoreTier(kind, id, settings)` | **Small** | now |
| Widen `isSystemEntitySelectable` to read setting **4** instead of the hardcoded 7 | **Small** | now |
| The manage screen — folded into **`SD-5`** (one grid, two settings) | **Medium** | with `SD-4`/`SD-5` |
| The structural guard (enforcing `core` on DROP/re-type/FK) | **Medium** | with `SD-4` |

**Two migrations? None.** `module_configs` already exists; the seed is written by `setValue`/`restoreDefaults`
at install, exactly like the tier setting. **No new table, no DDL.**

---

## 5. The two guardrails that must not move (copied verbatim from §C.2b, because they are the reason this is safe)

1. **It fails closed.** A missing, malformed or partially-written setting resolves to the **seed** — never to
   a weaker tier. A typo must not make a backbone table editable.
2. **The dictionary stays the source of truth for the default values.** The setting may be edited; the
   *reason* each seed value is what it is stays in the dictionary, so a change can be reviewed against the
   standard. **Adding a new tier name is a dictionary change, not a setting** — the same rule as
   *"every addition to the core list is itself a dictionary change"* (§C.3).

---

## 6. What I need from you (one line)

> **The recommendation stand-up, now as settings:**
> **1** — the four tiers (`core` / `platform_release` / `tenant_structural` / `tenant_data`) and the rule that only the *object→tier map* is a setting. **yes / change**?
> **2** — the seed = my earlier recommendation (the ~25 `core` tables + the `platform_release` set). **yes / trim**?
> **3** — the manage screen folded into `SD-5` (one grid), not a second UI. **yes / separate**?

**My recommendation: yes to all three.** Then this becomes `SD-2b` (the setting) with `SD-5` carrying the UI —
and the whole thing is a **seed + a grid row**, not architecture frozen in code.

**Nothing is blocked.** `SD-2` ships the mechanism; this ruling only decides *whether the list is a setting*
(you have said yes) and *what the seed is*. Until it lands, the registry is honestly one entry deep and says so.
