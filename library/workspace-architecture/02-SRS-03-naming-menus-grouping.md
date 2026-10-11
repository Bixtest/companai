# SRS-03 — Naming, Menus, Grouping, and the Organic (Non-Business) Wiring

**Batch B5 of the workspace-architecture workstream.**
Answers the owner's **Q4** ("how do we save it, name it, show it in the interface (like the menu), how do
we group functions (creating modules-like menu categories and items)") and **Q5** ("so the wiring is
organic and core, not dependent on a certain business functionality or a use case"), plus the *dashboard
half* of **Q11**.

**Status of this document:** first draft complete; every code claim carries the file and line it was read
from (rule 0 — only the code is evidence). It has **not** yet been through its hostile-critic round; the
round and its corrections are recorded in §9 when it runs.

**Provable sources read for this batch** (all in `workspace/starting-kit` unless stated):
- `packages/shared/src/lib/request-outcome/types.ts` — `FunctionPlacement` (`:203`), `functionPlacement`
  (`:217`), `FunctionCandidate` (`:246`).
- `packages/shared/src/lib/business-widget/placement.ts` — `placeFunction` (`:66`), the derivations.
- `packages/shared/src/lib/business-widget/registry.ts` — the whole registry (`:1-272`).
- `packages/shared/src/lib/kernel/canonical-id.ts` — the id grammar (`:1-60`).
- `packages/shared/src/lib/user-function/types.ts` — `UserFunction` fields (`:111-135`).
- `packages/shared/src/modules/navigation/backendChrome.ts` — the nav contract (`:1-59`).
- `packages/shared/src/modules/widgets/injection.ts` — `InjectionMenuItem` (`:400`), `InjectionMenuItemWidget`
  (`:419`), `InjectionDataWidgetModule` (`:450`).
- `packages/shared/src/modules/widgets/injection-loader.ts` — the data-widget discriminator (`:362-374`),
  the registry build (`:320-346`).
- `packages/ui/src/backend/AppShell.tsx` — `mergeSidebarItemsWithInjected` (`:189`),
  `mergeSidebarGroupsWithInjected` (`:234`), `mergeSectionGroupsWithInjected` (`:286`), the spot mounts
  (`:976`, `:1020`).
- `packages/ui/src/backend/injection/mergeMenuItems.ts` — the ordering primitive (`:45-80`).
- `packages/ui/src/backend/injection/spotIds.ts` — the spot ids (`:6`, `:12`).
- `packages/ui/src/backend/injection/InjectionSpot.tsx` — feature gating (`:67-83`).
- `apps/mercato/src/modules/example/widgets/injection/example-menus/widget.ts` — the live example (`:1-23`).
- Vision quotes: Doc 03 §45 *Creation flow* (line 1378; `Business IR generation` at line 1390), §61 *Function
  creation should feel like "teach the ERP"* (line 1787; the `Function name` / `Destination` block at lines
  1804-1811), §62 *Function library* (line 1826), §63 *Promote common Functions into modules* (line 1852);
  Doc 05 §160 *The most important reusable chain* (line 3404).

---

## §0 — The answer in one paragraph

**The menu, the grouping, and the "core, not use-case" wiring the owner asked about are already built —
but the one link that joins them to a saved Function is missing.** The kit already has (a) a **canonical-id
grammar** that makes a menu path an identity two people cannot spell two ways; (b) a **navigation contract**
(`BackendChromeNavGroup` / `BackendChromeNavItem`) into which any module can inject; (c) a **menu-injection
contract** (`InjectionMenuItem` with `groupId`, `groupLabel`, `groupLabelKey`, `groupOrder`, `features`,
`roles`, `placement`, `children`) that a widget declares and the shell merges; (d) a **merge primitive**
(`mergeMenuItems`) that orders built-in and injected items deterministically; and (e) a **group-creating
merge** (`mergeSidebarGroupsWithInjected`) that, when an injected item names a `groupId` no group owns,
**creates that group** — which is precisely the vision's §62 *"modules-like menu categories"*. And on the
Function side, `request-outcome` already defines **`FunctionPlacement = { path, label }`** with a constructor
that **refuses a non-canonical path at the edge**, and carries it on the `FunctionCandidate`. **What does
not exist is the join:** a saved `UserFunction` carries **no** placement field, and `placeFunction` copies
**no** path onto the placed Widget — so today a Function can be named and a menu can be injected, but
*nothing connects the name to the menu*. That join is a small, core, business-agnostic build (§5), and once
it exists the wiring is exactly what the owner asked for: a prompt produces a Business IR → the IR is saved
as a Function **with a canonical `placement.path`** → that path is projected into an `InjectionMenuItem`
whose `groupId` is the path's penultimate segment → the shell merges it into the sidebar, creating the
group if absent. **No ERP module, no business functionality, and no use case is named anywhere in that
chain** — which is the owner's own test for "core" (§7).

---

## §1 — The owner's two questions, decomposed

**Q4** — *"how do we save it, name it, show it in the interface (like the menu), how do we group functions
(creating modules-like menu categories and items)"*. Four sub-questions:

| # | Sub-question | Where it lands in this document |
|---|---|---|
| C1 | **Saving** — what persists a saved Function | §3 step 1 (the `FunctionCandidate` → `UserFunction` leg) |
| C2 | **Naming** — how a Function is named, and what "name" means | §4 (three names: id · label · title) |
| C3 | **Showing** — how a saved Function appears as a menu item | §5 (placement → `InjectionMenuItem`) |
| C4 | **Grouping** — how functions become modules-like categories and items | §6 (path segment → `groupId` → group creation) |

**Q5** — *"so the wiring is organic and core, not dependent on a certain business functionality or a use
case."* This is the acceptance test, not a separate feature: every link in the chain above must be provable
**without naming any ERP module**. §7 demonstrates it with a business-agnostic example, which is the batch's
exit gate.

---

## §2 — The measurements this batch rests on

Rule 0b — *never build before measuring*. Every claim below is a command that was run, with its output.

### 2a. The kit's navigation is built and menu-injectable (Q4's "the interface like the menu")

- `packages/ui/src/backend/AppShell.tsx` mounts **11** `spotId={...}` injection points (`grep -c "spotId={"
  AppShell.tsx` → `11`). Two of them are the sidebar: `:976` (`BACKEND_SIDEBAR_TOP_INJECTION_SPOT_ID`) and
  `:1020` (`BACKEND_SIDEBAR_NAV_INJECTION_SPOT_ID`). *(An earlier draft said "26" — that is the count across
  the whole `packages/ui/src/backend/` tree, not AppShell.tsx alone. `CORRECTED (rule 13)`.)*
- `packages/ui/src/backend/injection/spotIds.ts:6,12` — the two ids are `'backend:sidebar:top'` and
  `'backend:sidebar:nav'`.
- `packages/shared/src/modules/widgets/injection.ts:400` — **`InjectionMenuItem`** =
  `{ id, label, labelKey?, icon?, href?, onClick?, separator?, placement?, features?, roles?, badge?,
  children?, groupId?, groupLabel?, groupLabelKey?, groupOrder? }`. **A menu item already carries its own
  group, its own feature/role gates, and its own position.**
- `:419` — **`InjectionMenuItemWidget`** = `{ metadata, menuItems }`. A widget that contributes menu items
  is a "data widget" (discriminated at `injection-loader.ts:362-374`, key `'menuItems'`).
- `mergeMenuItems.ts:45-80` — the merge: built-in items first, injected items skipped if their `id` **or**
  `href` already exists (`:59-60`), and an injected item with a `groupId` and no explicit `placement` is
  spliced **after the last item of that group** (`:66-74`). Deterministic, no silent duplicates.

**Output:** the sidebar is not "to build". It exists, it is contract-driven, and any registered widget can
add a menu item to it **today** — the live proof is
`apps/mercato/src/modules/example/widgets/injection/example-menus/widget.ts:4-21`, a real
`InjectionMenuItemWidget` with `features: ['example.todos.view']`, `groupId: 'example.nav.group'`,
`groupLabelKey`, and `placement: { position: InjectionPosition.Last }`.

### 2b. The grouping (Q4's "modules-like menu categories and items") is a merge that *creates* groups

`AppShell.tsx:234-284` — `mergeSidebarGroupsWithInjected`:
1. buckets injected items by `groupId` (`:244-252`);
2. merges each existing group's items (`:262`);
3. **for every `groupId` no existing group owns, it pushes a new group** whose label is the item's
   `groupLabelKey` (translated) or `groupLabel` (`:266-281`).

**Output:** an injected menu item that names a `groupId` and a `groupLabel` **brings its category into
being**. That is *exactly* the vision's "modules-like menu categories and items" — a category and its items
arrive together, declared by the thing that owns them, and the shell simply renders what it is given. No
central registry of categories is consulted and none needs to exist.

### 2c. The placement type exists — with a refusing constructor

`request-outcome/types.ts:203-219`:

```ts
export type FunctionPlacement = { path: string; label: string }
export function functionPlacement(path, label): FunctionPlacement   // throws on a bad path or empty label
```

`functionPlacement` refuses a non-canonical `path` **at construction**. The grammar is the kernel's
(`kernel/canonical-id.ts:42`, `ID_PATTERN`): `^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$` — e.g. `finance.accounts_receivable`
is valid, `Finance > Accounts Receivable` is refused. The doc-comment on the type (`:189-201`) states the
reason verbatim from the vision: *"a menu that two people can spell two ways is not a menu"* — and §63's
*"user function → repeated pattern → vendor module"* cannot detect a repeated pattern if one pattern can be
named five ways. (The quote sits in the doc-comment on the type, `types.ts:191-192`.)

### 2d. The candidate exists — and it is deliberately *not* a Function

`request-outcome/types.ts:246-254` — `FunctionCandidate = { businessIr: unknown; name: string; placement:
FunctionPlacement }`. The comment (`:238-245`) is explicit: *"This is not a `UserFunction`… Keeping them
apart is what makes §2 Q2's rule structural: an `ephemeral_answer` carries **no** `FunctionCandidate`, so it
cannot be given a name or a menu entry by mistake."*

**Output:** the *"where it would go and under what name"* of the save step is **already modelled** — but only
on the candidate, i.e. the "would-be" object.

### 2e. **The gap: neither the saved Function nor the placed Widget carries the placement**

Two direct measurements:

```
$ grep -n "placement\|Placement\|menuPath\|groupId\|group" packages/shared/src/lib/user-function/types.ts
→ NO placement/menu/group field in UserFunction

$ grep -n "path\|menu\|group" packages/shared/src/lib/business-widget/placement.ts
→ (only prose comments; no path/menu/group field is set on the produced Widget)
```

`placeFunction` (`placement.ts:66-130`) derives the Widget's `id`, `version`, `name`, `inputs`, `actions`,
`dependencies`, `permissions` — **but sets no `path`, no `groupId`, no menu location**. `UserFunction` has
`{ id, tenantId, organizationId, name, description, operationType, businessIr?, businessCommandIr?,
parameterSchema, references, requiredPermissions, … }` (`types.ts:111-135`) — **no `placement`**.

**Output — this is the batch's central finding:** the "save as Function with a placement" idea is complete on
the *candidate* side and absent on the *saved* side. The join is what is missing, and the join is small (§5).

### 2f. The registry (§112–114) answers "where is it used" — but not "where does it sit in a menu"

`registry.ts:72-97` — the registry stores **definitions** keyed `id@version` and **instances** separately
(`§113`, rule 7). It answers §114's questions: `whereUsed` (`:90`), `dependenciesOf` (`:92`),
`dependentsOf` (`:94`). Instances carry `{ instanceId, widgetId, version, host?, slot? }` (`:64-70`).

**Output:** the registry already has the vocabulary of *placement* — an `instance` has a `host` and a
`slot` — but a **`slot` is a rendering location (which spot on which screen), not a *menu path***. The two
are different questions: *"where does this Widget render?"* vs *"under which menu category does a person
find it?"*. B5 adds the second; it does not disturb the first. (The registry's DB row is deferred to
`G-09` — `registry.ts:22-31` — and B5 does **not** need it; see §8.)

---

## §3 — The chain, arrow by arrow

The vision's chain (Doc 05 §160) is:

```
AI request → Business IR → result → Save as Function → Function → Widget → Workspace
```

B4 (`02-SRS-02`) traced this for the prompt→function lifecycle. B5 adds the **naming and placement** leg:

### 3.1 prompt → Business IR  *(BUILT — B4 §3.1)*

No change here. `authorBusinessQueryIr` produces the IR; its gap (no production caller) is `CC-58`, carried
by B4.

### 3.2 Business IR → a named, placed candidate  *(BUILT — this batch's starting point)*

`triageRequest` classifies the outcome; on a `function_candidate`, the outcome carries a
`FunctionCandidate` = `{ businessIr, name, placement }`. The `placement` is a `FunctionPlacement` built by
`functionPlacement(path, label)`, which **refused** a bad path already. **Both the name and the menu path
exist at this moment.**

### 3.3 candidate → saved Function  *(GAP — C1)*

Saving a `FunctionCandidate` means producing a `UserFunction`. Today:

- the `UserFunction` **has** `name` (`types.ts:114`) — so **C2 (naming) is half-built**: the saved Function
  can carry the human name.
- the `UserFunction` has **no** `placement` — so **C3/C4 (show + group) have nowhere to be remembered**.
  The path the user chose at save time is **discarded**.

**Verdict for §3.3:** a save that keeps the name but drops the placement is a save that produces a Function
nobody can find. **This is the missing link.**

### 3.4 saved Function → Widget  *(BUILT — `placeFunction`)*

`placeFunction` (`placement.ts:66`) turns a runnable Function into a Widget + IR, deriving inputs and
controls one-way. It is correct and needs **one** addition: it must **carry the Function's placement onto
the Widget** (a `path`/`groupId` projection), so the Widget's own declaration can be projected into a menu
item. This is additive — no existing derivation changes.

### 3.5 Widget → menu item  *(BUILT — the injection contract)*

Today a widget contributes menu items by **being a module** that exports an `InjectionMenuItemWidget`. The
shell's `InjectionSpot` loads registered widgets, gates them by `features` (`InjectionSpot.tsx:67-83` —
`hasAllFeatures`, and **an item with no features is admitted**, `:74`), and `mergeMenuItems` /
`mergeSidebarGroupsWithInjected` fold them into the sidebar.

**The subtlety that makes the wiring "organic":** the menu-injection mechanism is **declarative and
registry-driven** — a widget declares `menuItems`, and the shell renders whatever is registered. It does not
need to know the widget's business meaning. So projecting a saved Function's `placement` into a
`menuItems` entry is the **same act** the example widget performs — it just *generates* the entry from the
placement instead of hand-writing it.

### 3.6 the join, drawn

```
FunctionCandidate.placement = { path: 'team.reports.overdue', label: 'Overdue' }
   │  (save)
   ▼
UserFunction                      ← needs a `placement` field  ← THE GAP (§5.1)
   │  (placeFunction)
   ▼
BusinessWidget                    ← placeFunction copies the placement  ← THE GAP (§5.2)
   │  (project)
   ▼
InjectionMenuItem { id, label, groupId: 'team.reports', groupLabel: 'Reports', href }
   │  (merge — already built)
   ▼
sidebar group "Reports" → item "Overdue"      ← mergeSidebarGroupsWithInjected creates the group
```

---

## §4 — Naming: three names, and why they are not one

The owner asked *"how do we save it, name it"*. Our code already separates three things, and B5 keeps them
separate because collapsing them is a known defect class:

| Name | Where it lives | May it change? | What it is |
|---|---|---|---|
| **canonical id** (`path`) | `FunctionPlacement.path`, `UserFunction.id` | **No** — a rename is a new version | the identity; `finance.accounts_receivable` |
| **label** | `FunctionPlacement.label` | **Yes, freely** | what a person reads in a menu |
| **display title** | `UserFunction.name`, Widget `name` | Yes | the user's own words, e.g. "Overdue German Customers" (Doc 03 §45) |

The rule the code already enforces (`canonical-id.ts:12-16`): *"the ID is the identity. A display label is
localised metadata and may change freely; the ID may not. A rename creates a new `Version`; it never rewrites
the ID."* The vision's §61 (line 1787) shows the prompt-side consequence — the user sees *"Function name:
Overdue German Customers"* (line 1805) and *"Destination: Finance → Accounts Receivable"* (line 1811) — i.e. a
free title **plus** a canonical destination. (The prompt that produces the IR is §45, line 1378, whose
`Business IR generation` step is line 1390.) `functionPlacement` is the constructor that turns the free
destination into the canonical path; the free title stays in `name`.

**Our recommendation (reported, overrulable in one line):** `UserFunction.name` is the free title (keep as
is); add `placement: FunctionPlacement` for the canonical path + label. Do **not** derive the path from the
title (that is the "spelled five ways" defect), and do **not** derive the title from the path (that would put
`accounts_receivable` in front of a user).

---

## §5 — The join (the missing link), specified

Two small, additive changes. Both are **core and business-agnostic** — neither names an ERP concept.

### 5.1 Give a saved Function a placement

Add to `UserFunction` (`user-function/types.ts`) an optional field:

```ts
/** Where this Function sits in a menu. Absent for a Function with no home yet. */
placement?: FunctionPlacement
```

- **Why optional:** a Function that a person runs only by prompt, or one created before B5, has no placement.
  Absence is meaningful (`types.ts:121-126` already uses "declared absence, never an empty object" as a
  principle).
- **Why `FunctionPlacement` and not a new type:** the type and its refusing constructor already exist
  (`request-outcome/types.ts:203,217`). Reusing it means the save step and the candidate step agree by
  construction — the same "two identities" discipline the registry documents (`registry.ts:11-15`).
- **Effect on the candidate path:** the save step copies `candidate.placement` into `fn.placement`. One
  assignment, no new logic.

### 5.2 Carry the placement onto the Widget, and project it into a menu item

1. `placeFunction` copies `fn.placement` onto the `BusinessWidget` (a new optional
   `placement?: FunctionPlacement` on the Widget's `presentation`, or a top-level field — the *placement*
   decision is `§OQ-B5-1`).
2. A new **pure projector** `menuItemForFunction(fn)` (or `menuItemForWidget(widget)`) produces an
   `InjectionMenuItem`:

   ```ts
   // business-agnostic: derives the group from the path's segments, never from a business map
   {
     id: fn.id,
     label: fn.placement.label,
     href: `/backend/run/${fn.id}`,          // §OQ-B5-2 — the run surface address
     groupId: groupIdOf(fn.placement.path),   // e.g. 'team.reports'
     groupLabel: groupLabelOf(fn.placement.path),
     features: fn.requiredPermissions,
   }
   ```

   `groupIdOf` / `groupLabelOf` are **pure functions of the path** — e.g. everything before the last
   segment is the group. The design intends **no lookup table, no module name, and no use case**; that
   intent must be *proven by the implementation's tests*, not assumed (rule 0 — an intention is not yet
   evidence).

3. The shell already renders whatever `menuItems` a widget contributes (§3.5) and creates the group if
   absent (§2b). **The design expects no change to `AppShell.tsx`** — that is the point: the organic core is
   *already* the extension surface, and B5 only feeds it. *(If the build turns out to need a shell change,
   that is a finding to report, not a plan to assume away.)*

### 5.3 What this does NOT need

- **No `G-09`.** The reference layer (`@`/`#`) resolves *entities/fields* to model objects; placement is a
  *menu path*, which needs no resolution. The registry's DB row (`G-09`) is likewise not needed — the
  projector is pure and the registry is already a value (`registry.ts:22-31`).
- **No new persistence** beyond what the Function row (`CC-32`/`G-09`) will add — and the `placement` field
  rides that row when it is written, in the same migration (consistent with `CC-7`/`CC-32`'s "one migration,
  not two" call).
- **No business module.** Proven in §7.

---

## §6 — Grouping: path → category, and the "modules-like" result

The owner's phrase *"creating modules-like menu categories and items"* maps onto three already-built
mechanisms plus one derivation:

1. **A group is created by naming it** — `mergeSidebarGroupsWithInjected` (`:266-281`) synthesises a group
   from an injected item's `groupId`/`groupLabel` when no group owns that id. **A category does not need to be
   registered anywhere first.**
2. **An item is placed in a group** by setting the item's `groupId` — and with no explicit `placement`,
   `mergeMenuItems` (`:66-74`) splices it after the group's last item, so items arrive in a stable order.
3. **Order within/between groups** is controlled by `groupOrder` and `placement`
   (`InjectionMenuItem.placement`), already honoured by `insertByInjectionPlacement` (`mergeMenuItems.ts:76`).
4. **The derivation** (B5's one new pure rule): the group of a Function is the **path minus its last
   segment**. `team.reports.overdue` → group `team.reports`, item `overdue`; and a **nested** group can be
   expressed the same way for a sub-category, because a canonical id is *"unique by position — the parent is
   the prefix"* (`canonical-id.ts:16-18`). So the menu tree is a **projection of the path tree**, with no
   separate menu model to keep in sync.

**Why this is "modules-like" without being modules:** a business module ships a *fixed* set of categories and
items. Here the categories are **whatever paths the tenant's own saved Functions use** — so the menu grows
organically as Functions are saved, and a vendor module later ships the *same shape* (a `groupLabel` +
items) when a pattern is promoted (Doc 03 §63, lines ~1852-1878: *"user function → repeated pattern →
validated canonical capability → vendor module"*). The vendor module and the user Functions are the **same
kind of object** in the menu — which is exactly the "organic" the owner asked for.

---

## §7 — The business-agnostic demonstration (the exit gate)

The owner's test: **show the wiring without naming any ERP module or use case.** Here it is, using a neutral
domain.

> **The tenant is a consultancy. A person needs "who has not been contacted in 30 days".**

1. **Prompt / candidate.** A prompt produces a `function_candidate` whose
   `placement = functionPlacement('team.reports.followups', 'Follow-ups')`. *(Neutral: `team` is an org
   scope, `reports` is a category, `followups` is the item. No ERP module is named.)*
2. **Save (§5.1).** The candidate becomes a `UserFunction` with `name: 'Stale follow-ups'` (the free title)
   and `placement: { path: 'team.reports.followups', label: 'Follow-ups' }`.
3. **Place (§5.2).** `placeFunction` carries the placement onto the Widget; the projector emits
   `InjectionMenuItem { id: 'team.reports.followups', label: 'Follow-ups', groupId: 'team.reports',
   groupLabel: 'Reports', href: '/backend/run/team.reports.followups' }`.
4. **Merge (§3.5, §6).** `mergeSidebarGroupsWithInjected` finds no `team.reports` group (a fresh tenant),
   so it **creates** one labelled **"Reports"** and puts **"Follow-ups"** inside it.
5. **Result.** The sidebar now has a category that **no developer wrote and no module declared** — it exists
   because a person saved a Function with a path. A second saved Function with path `team.reports.overdue`
   lands in the **same** category automatically.

**Every agent in this demonstration is business-agnostic:** the id grammar, the placement constructor, the
save step, `placeFunction`, the projector, `mergeMenuItems`, `mergeSidebarGroupsWithInjected`. **The word
"customer", "invoice", "account", or any ERP module name appears nowhere.** The same chain works identically
for a hospital, a law firm, or a logistics tenant — which is the owner's definition of "core, not use-case".

**Contrast (what "use-case-coupled" would look like, and which we are avoiding):** a menu that is a hard-coded
array of module categories in a config file; a `placement` that had to be one of a fixed enum of ERP
destinations; a group that required a registered module to exist before an item could join it. Our kit has
none of these — §2b and §6 are the proof.

---

## §8 — What this hands to B6–B10

- **B6 (threads/collaboration):** unchanged and independent — a thread is a container; a placed Widget is a
  *thing* a thread can reference. The projector's `href` (`§OQ-B5-2`) is the join the thread layer will use.
- **B7 (extensibility):** B5 shows the *shape* of adding a capability (declare a menu item; the group
  self-creates). B7 generalises this to tools and widgets beyond menus.
- **B8 (the decision):** the reference systems (Buzz / OpenRig / Paperclip) are about *activity feeds, agent
  teams, and control planes*, not menus — so B5's finding **reduces** what B8 must reconcile for the menu
  question. Recorded for B8.
- **B9 (widget architecture end to end):** B5 establishes that the **dashboard/sidebar menu and the widget
  injection surface are the same mechanism** — B9 must not invent a second one. This is the dashboard half of
  Q11, answered here and consumed there.
- **B10 (mapping):** the two gaps in §5 map to concrete code edits, so they slot straight into the plan —
  plus the `placement` column on the Function row, which joins `CC-7`/`CC-32`'s deferred migration (trigger
  `G-09`).

---

## §9 — Corrections and open questions

### The hostile-critic round (separate agent, command+output per claim)

A separate hostile-critic agent audited this document against the code. **The critic listed eight findings;
on reconciliation six are distinct** (C1≡C7 and C3≡C8 were the same defect counted twice). **All six are
fixed in place above** (rule 13 — a falsified premise is corrected everywhere it appeared). They touch
citations and hedging only; the six do **not** change the document's central claim, which the critic
independently verified.

| # | Finding | Truth (command) | Fixed at |
|---|---|---|---|
| B5-C1 | §2a said AppShell.tsx mounts **26** injection points | `grep -c "spotId={" AppShell.tsx` → **11**; 26 is the count across all of `ui/backend/` | §2a |
| B5-C2 | §2c cited the canonical-id regex at `:41` | The regex is `ID_PATTERN` at **`:42`** (`:39` is `SEGMENT_PATTERN`) | §2c |
| B5-C3 | Header cited `InjectionDataWidgetModule` at `:435` | It is at **`:450`** | header |
| B5-C4 | §4 attributed the *"Function name / Destination"* block to **§45** (line ~1807) | It is **§61** (line 1787; block at 1805/1811); §45 *Creation flow* is line 1378, `Business IR generation` line 1390 | §4 |
| B5-C5 | §2c cited the `"spell two ways"` quote at `:195-201` | It is at **`:191-192`** | §2c |
| B5-C6 | §5.2's "No lookup table…" and "Nothing in AppShell.tsx changes" were unhedged absolutes about a *proposed* change | They are design intentions, not measured facts; now labelled as such | §5.2 |
| B5-C7 | §2a's "26" figure — see C1 | (same as C1) | §2a |
| B5-C8 | Header's `:435` figure — see C3 | (same as C3) | header |

**Critic findings the document passed** (verified correct, no change): the §2e **central gap claim** (three
commands: no placement in `user-function/types.ts`; `placeFunction` sets no path/group; `UserFunction` does
carry `name`/`tenantId`/`operationType`/`parameterSchema`); the §2b/§6 **group-creating merge**
(`AppShell.tsx:266-281`); the §3.5 **feature gating** (`InjectionSpot.tsx:74` — `features.length === 0 ||
hasAllFeatures(...)`); `spotIds.ts:6,12`; `injection.ts:400,419`; `registry.ts:90,92,94`; the live example
widget; and Doc 05 §160's arrow chain (verbatim, line 3404).

**Lesson banked:** *a count is a claim about a scope — name the scope or the number is wrong.* "26 injection
points" was true of `/backend/` and false of `AppShell.tsx`; the citation named the wrong file for the right
number. (This is the twin of B4's lesson: do not inherit a number/negative without re-measuring it against
the exact subject you are describing.)

### Open questions for the owner (rule 11 — the owner decides *what* to build)

- **OQ-B5-1 — is the placement a field of the Function, or of the Widget?** Placement is *where a person
  finds it*, which feels more like a *Widget* property (§113 keeps definitions vs instances apart, and two
  Widgets from one Function could sit in two menus). But it is *chosen at save time*, on the Function. Our
  recommendation: **Function owns the canonical path; the Widget's placement is a projection of it**, so a
  saved Function has one home by default and the instance layer can override later. **One question: should a
  Function be allowed to appear in more than one menu, or is one home per Function the rule?**
- **OQ-B5-2 — what is the run surface's address?** The projector needs an `href` for a saved Function. Our
  recommendation: a neutral `/backend/run/{id}` run surface. **One question: does a saved Function get its own
  page, or is it always opened as a Widget in the workspace?** (This overlaps Q11/B9.)
- **OQ-B5-3 — is `groupId` the full parent path, or only the immediate parent?** `team.reports.overdue` →
  group `team.reports`, or group `reports` nested under `team`? Our recommendation: the **full parent path**
  (simplest, unambiguous, matches the id grammar's "parent is the prefix"). **One question: do you want a
  nested menu tree, or a flat list of categories?**

These are **non-blockers** — B5 is complete without their answers, because each has a recommended default that
is provable and overrulable in one line. They are recorded in `discussion_points.md` (Part 2).

---

## §10 — What this batch read, and what it deliberately skipped

**Read (measured):** the five files named in §2 plus `user-function/types.ts`, `backendChrome.ts`,
`injection.ts`, `injection-loader.ts`, `spotIds.ts`, `InjectionSpot.tsx`, the live example widget, and the
vision §45/§61/§62/§63 quotes and Doc 05 §160.

**Skipped, with reason:**
- The **registry's DB row** (`G-09`) — not needed; the projector is pure and the registry is a value.
- The **`@`/`#` reference layer** (`G-09`) — it resolves *model* references, not *menu* paths; §5.3.
- The three reference systems (Buzz/OpenRig/Paperclip) — their menu/workspace relevance is B8/B9's; B5 notes
  the reduction in §8.

---

## §11 — Exit gate

**Does the SRS demonstrate the wiring with a business-agnostic example — a function created, named, placed
in a menu, and grouped, without naming any ERP module?**

**Yes — §7.** A consultancy's "stale follow-ups", placed at `team.reports.followups`, lands in a
self-created "Reports" category, and every mechanism in the chain is a pure, business-agnostic function of
the path. The one missing link (the join from a saved Function to a menu item, §5) is specified in two small
additive changes that name no business concept.

**Gate result: PASSED.**
