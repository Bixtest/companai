# The agent's protection tier is a SETTING, set per object — not a blanket rule

**Written:** 2026-10-09. **Author:** the agent (recording the owner's ruling). **Status:** ✅ **DECIDED —
the owner's approach supersedes the agent's first recommendation (owner, 2026-10-09).**

**Parent:** `AH-1` (the agent as a kernel object); `CORE-BOUNDARY.md` §2 (Ring 1/Ring 2), §3
("core-function list additions"); `DECISION-core-object-set-as-settings.md` (**the pattern this reuses**);
`SD-2b`/`SD-3` (the shipped tier engine); `SPECIFICATIONS-DICTIONARY.md` §C.2b (the precedent) + §C.3 (the rule).
**Register:** `COMPLETION-CALLBACKS.md` **CC-31**; **Supersedes:** the *agent row* of the agent's earlier
recommendation in this session (recorded in `JOURNAL.md`, 2026-10-09).

---

## 0. The owner's ruling, and what it corrects

**His words (2026-10-09):**

> *"Your answer is fine and we can go with it, but it also identifies why my idea is better. We say system
> agents are objects — in your response — but we don't know what kind of system agents we will use in the
> future. So just like we did with database (I am assuming you followed this recommendation there) whenever
> as a superadmin I add a db schema change I set if this is core across the tenants and unchangeable — if not
> tenants can customize and change it, similar with agents. When I create an agent I can set whether it is
> core — even if it is an agent used separately by each tenant (tenant-based agents). Analyze that and decide
> if this works better or your initial approach."*

**The agent's answer: yes, his approach works better — and materially so.** The agent's first idea was
**"an agent is not core, full stop; except *system* agents, maybe"** — a single blanket rule for every agent,
forever. His idea is **the same per-object tier engine the platform already ships for tables and roles**
(`SD-2b`: `core-settings.ts` + `core-objects.ts` over `module_configs`). It is a **reuse, not a new
mechanism**, and it removes the defect in the blanket rule: a single fixed answer cannot survive agent kinds
we have not imagined yet.

**The assumption he checked — confirmed.** He asked *"I am assuming you followed this recommendation there."*
**Yes.** The database analogue is **already built**: `resolveCoreTier(kind, id, settings)` reads the
object→tier map from `module_configs`, so a superadmin marks a table/column/relation/function/role
`core` / `platform_release` / `tenant_structural` / `tenant_data` **from the UI, with no deploy**
(`DECISION-core-object-set-as-settings.md`, `SD-2b`, owner's instruction 2026-10-09). His instinct here is the
**same correction he made for tables**, now generalised to agents — and it is the *better* one, for the same
reason it was better there.

---

## 1. The decision

**An agent's protection tier is a per-object SETTING, not a hardcoded rule.** When an agent is created, the
superadmin assigns it a tier — exactly as they do a table:

| Tier | What it means for an agent | Who may change it |
|---|---|---|
| **`core`** | ships with the platform; **no actor — tenant, superadmin or AI — may delete it** | a platform release only |
| **`platform_release`** | protected from tenants; changeable by us | a platform release |
| **`tenant_structural`** | a tenant may shape it, but **only through the S2 gate** (`SD-1`) + the grammar (`SD-4`) | the tenant, gated and audited |
| **`tenant_data`** | ordinary business data — create, use, delete freely | the tenant |

**The four tiers and the refusal rule stay code (Ring 1); only the *assignment* is a setting (Ring 2).** This
is the owner's own framing: *"a setting can move an object **between** tiers; it can never **delete the
tiers**"* (`core-settings.ts`). It is also why his "even a tenant-based agent can be marked core" works: a
superadmin may mark a **tenant-visible** agent `core` so no tenant can remove the one the platform depends
on — the visibility (which tenants see it) and the protection (may it be deleted) are **two different
questions**, and the tier answers the second.

---

## 2. Why it wins — three measured reasons

1. **It reuses the shipped engine, so it costs little and cannot drift.** `core-settings.ts` already has the
   seed + strict parser + fail-closed default; `core-objects.ts` already refuses delete/rename for a core
   object. **The change is to admit `agent` as a kind and route the agent guards through the same
   `resolveCoreTier` the tables already use** (S5: one engine, never a second).
2. **It survives unforeseen agents.** His key point: *"we don't know what kind of system agents we will use
   in the future."* A blanket "agents are not core" would force a **deploy** the day a load-bearing system
   agent appears — which is exactly the defect the owner already named for tables (*"a deploy to protect a
   table the superadmin had just created — obviously wrong"*). The setting removes that future deploy.
3. **It honours the invariance rule he set.** The values are editable; the **engine** and the refusal rule
   are not. His approach does not weaken the backbone — it uses it.

**The one honest cost, named (not hidden).** `CORE_SETTING_KINDS` is `['table','column','relation',
'function','role']`. Admitting **`agent`** is **a new *kind*** — and the rule that governs this is precise:
*adding a **tier** is a dictionary change* (`DOC §2.3`), while *adding a **kind*** is **the same class of
change** (it widens the vocabulary the registry speaks) — so **`agent` as a core-object kind is itself a
dictionary addition**, recorded in `SPECIFICATIONS-DICTIONARY.md` §C.3 and here, and it is **small and
localised** (the registry shape already fits; the existing tests extend).

**There are TWO ways to carry the per-object flag; the Role precedent shows both, and the choice matters.**

- **(A) The setting** (`module_configs`, keyed `{agent-id → tier}`) — **no migration**; assignable from the UI
  with no deploy; the same route the *tables* use. **Recommended for `AH-1`'s first slice.**
- **(B) A row column** — measured: the `Role` entity **already carries `isCore: boolean`**
  (`auth/data/entities.ts:76`), and the guard reads it (`core-object-guard.ts:86`, `{ isCore: role?.isCore }`).
  So an `Agent.isCore` column would be the *exact* "set it when you create it" shape. **This one needs a
  migration** (a new column), and the host cannot currently prove a migration (`CC-31(a)`), so it is the
  **second** slice, not the first.

**Both satisfy the owner's requirement**; (A) is the honest first step because it needs no DDL and reuses the
shipped engine. (B) can follow when migrations are provable again — and note the two can **coexist**: a
column for the row's own flag, the setting for the map, as they do for roles today.


---

## 3. What changes in the build (`AH-1` and after)

- **`AH-1`'s "is the agent core?" leg is RESOLVED and DEFERRED TO A SETTING — not a one-off owner ruling.**
  There is no longer a single yes/no for the owner to give. The object is built; the **tier is assigned**
  (seeded to `tenant_data` — an agent is ordinary data unless and until someone marks it otherwise, which is
  the fail-closed-safe default consistent with `DEFAULT_CORE_TIER = 'tenant_structural'` routing unknowns to
  the S2 gate).
- **The build gains one piece, and it is the same piece the tables have:** teach the core-object registry
  that a valid kind is `agent`, and route the agent delete/rename guard through `resolveCoreTier`. This is
  the S5 "one engine" reuse, **not** a rival guard.
- **`AH-10` (system agents) no longer needs a special carve-out.** A platform-machinery agent is simply an
  agent whose tier is seeded/marked `core` or `platform_release`. The tier mechanism covers it — which is
  why the owner's approach is *stronger* than the agent's "system agents, maybe" hedge.
- **The dictionary addition** (`agent` as a core-object kind) is recorded in §C.3's list in the same change
  that lands it (rule: *every addition to the list is itself a dictionary change*).

---

## 4. The one thing the owner should know (plain English)

**Nothing is asked of you by this decision.** It *removes* a question (the "is the agent core?" yes/no) and
gives you a control instead: when you create an agent, you set its tier — the same way you already set
whether a table is protected. The four tiers and the rule that a `core` thing cannot be deleted stay fixed
in the platform; only *which* agent is in *which* tier is yours to set, from the UI, any time.

**Recommended seed for the agent tier:** `tenant_data` (an agent is business data by default). A future
system agent is marked `core`/`platform_release` **when it is created**, by you or by the platform's own
install seed — no code deploy required.
