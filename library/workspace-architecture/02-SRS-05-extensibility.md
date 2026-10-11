# SRS-05 — Extensibility: Adding Tools and Widgets Over Time

**Batch B7** of the workspace-architecture workstream. **Answers the owner's Q8 (tools) and Q9 (widgets).**

**The owner's words this answers** (Message 6, 2026-10-11):

> *"How do we add tools and functionalities as we go to that workspace? Same goes for the widgets
> architecture."*

**What "as we go" means here.** The owner is asking how the workspace **grows** after it ships: a new
tool, a new panel, a new analytic, a new button — added **without rebuilding the product**, and added by
**three different authors**: us, a tenant, and the AI. This is the batch that decides **who may extend
what, through which mechanism, and behind which gate.**

**Reading order.** This file assumes B1 (`01-RECON.md`), B4 (`02-SRS-02-function-lifecycle.md`) and B5
(`02-SRS-03-naming-menus-grouping.md`). It **builds directly on B5's §5** (the join that turns a saved
Function into a menu item), because that join *is* the extension path for the common case.

---

## §0 — The answer in one paragraph

**The kit already has a real, working extension system — and it is the one we should extend, not
replace.** A module declares **widgets** in files named `widgets/injection/<name>/widget.ts` and a
**table** in `widgets/injection-table.ts` that maps a **named spot** (e.g. `menu:sidebar:nav`,
`data-table:customers.people:columns`, `portal:dashboard:sections`) to those widgets; a build-time
generator discovers them, and a runtime loader resolves, gates and renders them. On top of that sits a
second mechanism, **component override**, which wraps or replaces an existing component by handle. Both
are the kit's **UMES** extension system. So "how do we add tools as we go?" has a precise answer for
**two of the three authors already**: *us* extend by **shipping a module** (or adding a widget to one),
and *the AI* extends by doing **exactly the same thing programmatically** — because the vision's own rule
is *AI generates IR/patches, not UI code* (§20). The **one route that does not exist yet** is a
**tenant authoring a widget at runtime with no deploy**: today every widget is discovered at **build**
time from files on disk. That is not a defect — it is the correct security posture for a multi-tenant
product — but it means the tenant route must be **specified deliberately** as *declarative content over
the existing renderer* (a new widget **defined** as rows, not a component **compiled** on the server).
**Verdict: three routes, one carrier (UMES spots + the `business-widget` IR); route 1 (platform) and
route 3 (AI) are buildable on what exists today; route 2 (tenant) is a new, *declarative-only* surface
that must never load tenant-supplied code.** The exit gate is met in §7.

---

## §1 — The owner's two questions, decomposed

| Code | The question, split into the parts that actually have different answers |
|---|---|
| **C1** | **What is a "tool"** in our terms — and is a tool the same thing as a widget? |
| **C2** | **What is the existing extension mechanism**, measured — spots, tables, loader, overrides? |
| **C3** | **Who may extend** — us, a tenant, the AI — and is "author" one thing or three? |
| **C4** | **For each author: what are they allowed to add**, and what is structurally off-limits? |
| **C5** | **Which existing mechanism carries each author's extension** — file, table, registry, patch? |
| **C6** | **What must be gated** for each author (permission, trust level, sandbox, review)? |
| **C7** | **How does an extension reach the user** — the path from "added" to "visible in the workspace"? |
| **C8** | **Does adding a widget need a deploy**, or can it happen live? |
| **C9** | **What breaks existing extensions** — the change classes, and what protects them? |

---

## §2 — The measurements this batch rests on

Every claim below has a command and an output. **Rule 0 — only the code is evidence.**

### 2a. The extension system is real, named, and has its own collector (C2, C7)

**UMES** has its own directory with its own types and its own collector:

```
packages/cli/src/lib/umes/{collector,check,inspect,list,index}.ts
```

`collector.ts:7` declares the extension taxonomy **verbatim**:

```ts
export interface UmesExtensionEntry {
  moduleId: string
  type: 'enricher' | 'interceptor' | 'component-override' | 'injection-widget'
  id: string
  target: string
  priority: number
  features?: string[]
  details?: Record<string, unknown>
}
```

**Four extension types, one of them `injection-widget`.** So the platform already models "extending the
UI" as a **first-class, enumerated, collectable** thing. `collectUmesData(resolver)` (`collector.ts:23`)
walks the **enabled modules** (`resolver.loadEnabledModules()`), and for each resolves its extension
files — including `widgets/injection-table.ts` (`collector.ts:146`).

**Proof:** `grep -n "export function\|export interface" packages/cli/src/lib/umes/collector.ts` →
`UmesExtensionEntry` at `:7`, `UmesModuleData` at `:17`, `collectUmesData` at `:23`; all four `type`
literals sit on the single line `:8`.

### 2b. A widget is two files and one table row — the whole authoring contract (C2, C4)

A module's widgets live under a **fixed convention**. Measured on the canonical example:

```
apps/mercato/src/modules/example/widgets/
  injection-table.ts                     ← the table: spot → widgetId
  injection/
    example-menus/widget.ts              ← a menu-item widget (23 lines)
    crud-validation/widget.client.tsx    ← a component widget (needs a client component)
    customer-priority-column/widget.ts   ← a *declarative* widget (data payload, no component)
    ...
  dashboard/
    welcome/{widget.ts, config.ts, widget.client.tsx}   ← a dashboard tile
```

Two **kinds** of injection widget exist, and the difference is load-bearing:

- **A component widget** — `{ metadata, Widget: React.ComponentType, eventHandlers? }`
  (`injection.ts:243`). It exports **code** (`widget.client.tsx`).
- **A declarative data widget** — one of `columns | rowActions | bulkActions | filters | fields | steps |
  badge | menuItems` (`injection.ts:450`, the `InjectionDataWidgetModule` union). It exports **data**, no
  component. `example-menus/widget.ts` and `customer-priority-column/widget.ts` are this kind.

The runtime decides which it is by inspection — `isDataWidgetModule` checks for exactly those keys
(`injection-loader.ts:362-374`). A widget that is neither a component nor a declarative payload is
**refused loudly** at load (`injection-loader.ts:403-407`: *"must export either Widget component or a
declarative data payload"*).

**Proof:** `cat apps/mercato/src/modules/example/widgets/injection/example-menus/widget.ts` → a plain
object with `metadata.id` + `menuItems[]`, **no component**; `grep` for `InjectionDataWidgetModule` →
`injection.ts:450`; the refusal string → `injection-loader.ts:405`.

### 2c. The table is per-module, keyed by a **named spot**, with priority and placement (C2, C7)

`widgets/injection-table.ts` (measured: `example/widgets/injection-table.ts`) exports a
`ModuleInjectionTable` (`injection.ts:484` = `Record<InjectionSpotId, ModuleInjectionSlot | ModuleInjectionSlot[]>`).
Each entry is either a bare `widgetId` string, or an object with `widgetId`, `priority`, and **placement**
(`groupId`, `groupLabel`, `column`, `kind: 'tab' | 'group' | 'stack'`) — `injection.ts:191-215`,
`ModuleInjectionSlot` at `:479`.

Spot ids are **strings, and they are namespaced by convention**, e.g. measured in the example table:

```
portal:dashboard:sections          menu:sidebar:main           menu:topbar:profile-dropdown
crud-form:example.todo             data-table:customers.people:columns
data-table:customers.people.list:row-actions                 sales.document.detail.quote:tabs
widget:example.injection.crud-validation:addon               example:phase-c-handlers
```

The table is **conditional**: the example module composes `alwaysEnabledInjectionTable` and
`optionalCrossModuleInjectionTable` behind **two** env flags — `NEXT_PUBLIC_OM_EXAMPLE_INJECTION_WIDGETS_ENABLED`
**or** `NEXT_PUBLIC_OM_CRUDFORM_EXTENDED_EVENTS_ENABLED` (`injection-table.ts:123-124`, the `||` ternary).
So "is this widget on?" is already a **per-module, per-spot, priority-ordered** decision — and it can be
keyed on **either** of two independent switches.

**Proof:** `cat apps/mercato/src/modules/example/widgets/injection-table.ts` → the two tables and the
`? :` composition at the bottom; `InjectionWidgetPlacement` → `injection.ts:191`.

### 2d. The discovery is **build-time**, and the loader is a **runtime registry with a version** (C8)

Discovery is done by a **generator**, not at request time:

```
packages/cli/src/lib/generators/extensions/injection-widgets.ts:192
  outputFiles: ['injection-widgets.generated.ts', 'injection-tables.generated.ts']
packages/cli/src/lib/generators/extensions/injection-widgets.ts:214
  const table = ctx.resolveModuleFile(ctx.roots, ctx.imps, 'widgets/injection-table.ts')
```

So a file dropped on disk becomes a widget **when the generator runs** — i.e. **at build**. The runtime
then consumes the generated registry:

- `registerCoreInjectionWidgets(entries)` / `registerCoreInjectionTables(tables)`
  (`injection-loader.ts:144`, `:167`) — populated at bootstrap from the **client** bootstrap
  (`apps/mercato/src/components/ClientBootstrap.tsx:45-46`) and the shared bootstrap **factory**
  (`packages/shared/src/lib/bootstrap/factory.ts:151`). *(Measurement note: `apps/mercato/src/bootstrap.ts`
  only **imports** the generated tables and hands them to the factory — the registration **calls** are in
  `ClientBootstrap.tsx`, not there.)*
- The registry has a **version** (`_injectionRegistryVersion`, `:56`) and **notifies subscribers** on
  change (`notifyInjectionRegistryChanged` `:132`), so a running client can re-render when the registry
  changes (`subscribeToInjectionRegistryChanges` `:228`). That is what makes HMR work in dev.
- Resolution for a spot: `getResolvedEntriesForSpot(spotId)` (`:549`) merges **exact** entries with
  **wildcard** entries (`matchWildcardPattern`, `:557`), **dedupes by `moduleId:widgetId`** (`:561-568`),
  and **sorts by priority descending** (`:570`).

**The consequence, stated plainly:** *the extension surface is live at runtime, but the set of
extensions is fixed at build.* A new **file** needs a build; a new **table row** referencing an existing
widget also needs a build (because the table is generated too). This is the fact that makes the tenant
route a **new** design (§6), not a config toggle.

**Proof:** `grep -rn "injection-table.ts" packages/cli` → the generator at
`generators/extensions/injection-widgets.ts:214` and the UMES collector at `umes/collector.ts:146`;
`grep -n "version\|subscribe" injection-loader.ts` → `:203` `getInjectionRegistryVersion`, `:228`
`subscribeToInjectionRegistryChanges`.

### 2e. There are **two** rendering sinks, and the shell reads them (C7)

1. **`spotId` mounts.** `AppShell.tsx` mounts **11** injection spots (B5 measured the count;
   `grep -c "spotId={" AppShell.tsx` → 11), **five** of them sidebar-scoped (lines 976, 1020, 1141, 1147,
   1153 — `grep "spotId={" AppShell.tsx | grep -c SIDEBAR` → 5). *(Correction, rule 13: an earlier draft
   said "two of them the sidebar"; the measured figure is **five**.)* Any widget whose table row targets
   one of those spot ids renders there **automatically** — no shell change.
2. **Menu items.** An `InjectionMenuItemWidget` (`injection.ts:419`) contributes `menuItems`, merged by
   `mergeMenuItems` and `mergeSidebarGroupsWithInjected` — **B5's whole subject**. A widget can therefore
   **add a menu entry and create a menu group** just by declaring it. That is the owner's *"modules-like
   menu categories and items"* mechanism, and it is the **same** mechanism route 2 and route 3 will use.

**Proof:** B5's measurements (`02-SRS-03` §2a/§2b) — `InjectionMenuItem` at `injection.ts:400`,
`mergeSidebarGroupsWithInjected` at `AppShell.tsx:234-284`.

### 2f. **Component override** is the second extension mechanism — and it is code-level (C2, C4)

`packages/shared/src/modules/widgets/component-registry.ts` (133 lines) lets a module **replace, wrap, or
props-transform** an existing component by **handle**:

```ts
ComponentReplacementHandles = {
  page: (path) => `page:${path}`,
  dataTable: (tableId) => `data-table:${tableId}`,
  crudForm: (entityId) => `crud-form:${entityId}`,
  section: (scope, sectionId) => `section:${scope}.${sectionId}`,
}   // component-registry.ts:128-133
```

An override may be gated by `features` (`:92-94`, via `hasAllFeatures`) and is applied in priority order
(`:97`). **This is strictly stronger than injection** — it can replace a component's implementation — and
is therefore **strictly more dangerous**. It is, and must remain, a **platform-author-only** mechanism
(see §5, route 1). No tenant-supplied override may ever be registered: it *is* arbitrary code.

**Proof:** `grep -n "export" component-registry.ts` → `ComponentOverride` `:16`, `registerComponentOverrides`
`:77`, `resolveRegisteredComponent` `:100`, `ComponentReplacementHandles` `:128`.

### 2g. The Business Widget layer already carries the contract an extension must satisfy (C4, C5)

`packages/shared/src/lib/business-widget/` (**Sprint G-07 ✅**) is the *semantic* object a workspace
widget is: `BusinessWidget` (`types.ts:288`) with `inputs`, `outputs`, `actions`, `events`,
`dependencies`, `permissions`, `collaboration`, `persistence`, `rendering`, `responsive`, `ai`; a
`WidgetIR` (`ir.ts:171`) that is **type/source/title/inputs/actions and nothing else** — there is
*no place to put a component, a class or a style*, which is the property the type-level test asserts and
the `FRONTEND_VOCABULARY` guard enforces (`ir.ts:190`). A widget's `source` is `{ function }` or
`{ entity }` (`ir.ts:151`) — **a Widget holds no data of its own** (rule 2).

**This is the load-bearing fact for the whole batch:** the platform already has a **code-free, declarative,
semantic** description of a widget — the IR — and a **registry** that versions it and answers *"where is
it used / what does it depend on"* (`registry.ts:72-97`). **Extensibility = putting new IR into that
registry and new spot-rows pointing at it.** It is *not* putting new components on a server.

**Proof:** `grep -n "export" business-widget/ir.ts` → `WidgetIR` `:171`, `WidgetSource` `:151`,
`FRONTEND_VOCABULARY` `:190`; `grep -n "export" business-widget/registry.ts` → `WidgetRegistry` `:72`.

### 2h. The vision's extension paragraphs, and the analysis's verdict (C3, C6)

The vision's governing rules for extension are already registered as `N7-nn` by B4's analysis
(`library/analysis/findings/04-vision-workspace.md`). **A citation note, because it is a real trap:**
`N7-01…N7-40` are the **40 non-negotiable rules** (Part LXXIII) and the number is the **rule's number**,
*not* a §-number; `N7-41…N7-60` are **body statements** and their number **is** the §-number. So below,
`N7-14` means *rule 14* (Part LXXIII), while `N7-51` means *§124*. The `§` column below is the true
section.

- **N7-14** (rule 14) — *"Function = behavior; Widget = interaction."*
- **N7-20** (rule 20) — *"AI generates Widget IR / patches, not arbitrary UI code."*
- **N7-29** (rule 29) — *"Widget libraries are UX over a canonical Object Registry."*
- **N7-30/31** (rules 30/31) — fork without duplicating truth; outputs can become documents/tasks/
  decisions/Functions.
- **N7-36/38** (rules 36/38) — graphs inspectable; every Widget has an owner, purpose and dependency graph.
- **N7-39** (rule 39) — high-risk actions need explicit authorization **and audit**.
- **N7-49** (§110) — change class: *"a new dependency/command/permission/metric/integration requires
  review."*
- **N7-50** (§111) — change class: *"removing a required input/output, or changing semantics/Function/
  authorization, is a breaking change."* (Rule 48 = §109, layout/title/icon = safe.)
- **N7-51** (§124) — five **trust levels**: SYSTEM, FIRST_PARTY, TENANT, PERSONAL, UNTRUSTED.
- **N7-52** (§125) — an external integration must **declare** the integration, the data leaving the
  platform, the credentials and the permissions.
- **N7-54** (§139) — promoting a personal Widget to a system capability must **preserve or replace its
  dependencies**.

The vision's **patch language** (§79–81) is the AI's write vocabulary — **13 operations** (§79):
`ADD_WIDGET, REMOVE_WIDGET, MOVE_WIDGET, RESIZE_WIDGET, UPDATE_WIDGET, SET_PARAMETER, SET_SELECTION,
BIND_WIDGET, UNBIND_WIDGET, ADD_REFERENCE, ADD_COMMENT, CREATE_TASK, PROPOSE_FUNCTION`. And §80 fixes the
division of labour: **the AI proposes a patch; the Workspace Runtime validates and applies it.** §121–122
gives the sandbox (synthetic/masked/read-only preview); the phrase *"No production mutation"* is §119's
(**Preview**), immediately above the sandbox part. §123 nails the invariant *"a Widget cannot grant
permissions — it may request `invoice.cancel`, but the platform decides."*

The analysis's verdict (§15b) stands and B7 adopts it: the kit's front end is the **rendering layer**,
the vision's Runtime/IR/Registry are **new builds above it**, and the word *"widget"* is a **collision**
(kit tile vs Business Widget). B7 uses **"injection widget"** for the kit's object and **"Business
Widget"** for the vision object, consistently.

**Proof:** `sed -n '4021,4065p'` for the manifest (§LIX); `sed -n '1972,2030p'` for the patch language;
`sed -n '2724,2800p'` for sandbox/trust; `grep -n "N7-51\|N7-52\|N7-49\|N7-50" 04-vision-workspace.md`.

---

## §3 — What a "tool" is, in our terms (C1)

The owner says *"tools and functionalities"* and *"the widgets architecture"* — two words. In our code
they are **not** the same object, and the split is already precise:

| The owner's word | Our object | What it is | Where it is built |
|---|---|---|---|
| **a "tool"** | a **User Function** | a saved, re-runnable **behaviour** — *"the prompt you no longer need to type."* It *does* something; it returns data or proposes a change. | `user-function/` (built minus persistence/caller) |
| **a "widget"** | a **Business Widget** | a saved, re-runnable **interaction** — a panel that *shows* something and *lets you act*. It holds no data; it points at a Function or an entity. | `business-widget/` (Sprint G-07 ✅) |
| **where it appears** | an **injection widget** in a **spot** | the kit's *rendering* object: the thing the shell actually mounts or lists in a menu. | `widgets/injection/` + `injection-table.ts` |

And the vision's one-line law that ties them: **"Function = behaviour; Widget = interaction"**
(`N7-14`, *rule 14*); **"Workspace = organisation of Widgets"** (`N7-15`, *rule 15*).

**So "adding a tool as we go" and "adding a widget as we go" are the same three-step act**, on two
different nouns:

```
1. author the *thing*      → a Function (behaviour)  or  a Business Widget (interaction)
2. place it                → give it a menu path (B5's join) and/or a spot
3. render it               → an injection widget / a spot row / a menu item  (already built)
```

This is exactly B5's chain with one extra noun. **B7's job is to say who may do each step, and through
what door.**

---

## §4 — Who may extend, and what each author may add (C3, C4)

The vision's **five trust levels** (§124) and the product's **three authors** are not the same axis, and
conflating them is how this gets designed wrong. Two axes:

**Axis 1 — author** (who does the act): **platform** (us) · **tenant** (a customer user) · **AI**.
**Axis 2 — trust** (how far the artefact is trusted): SYSTEM · FIRST_PARTY · TENANT · PERSONAL ·
UNTRUSTED.

The mapping is deliberate and is the heart of this batch:

| Author | Acting as trust level | May add | May **never** do |
|---|---|---|---|
| **Platform (us)** | SYSTEM / FIRST_PARTY | any injection widget (component **or** declarative); **component overrides**; new spots; new Function/Widget definitions; new IR types | (nothing structural — we own the codebase) |
| **Tenant (a user)** | TENANT / PERSONAL | **declarative only**: a Function (via the prompt→save chain), a **Business Widget composed from existing IR types over existing Functions/entities**, a placement, a dashboard layout | load or author **code**; register a component override; create a **new** spot; invent a **new** IR type; touch another tenant |
| **AI** | inherits the **requesting user's** trust, capped at TENANT | **propose** a patch (§79) or an IR; **propose** a Function (`PROPOSE_FUNCTION`) | apply anything unvalidated; exceed the user's permissions; publish; run outside the sandbox |

Two laws make this safe **by construction**, not by policy:

1. **The AI cannot exceed the user it acts for.** This is not new: B4/`request-outcome` already models the
   AI's output as a **`FunctionCandidate`** (`request-outcome/types.ts:246`) — deliberately *not* a saved
   `UserFunction` — and `runFunction` already enforces the artefact's `tenantId` (`run.ts:140-148`,
   `WRONG_TENANT`). Scope enters from **two** channels (the request's `CompileContext` **and** the stored
   artefact's own `tenantId`). So an AI-authored extension is **born scoped to a user and a tenant**, and
   the owner's DP-02 rule applies unchanged: **no permissions set ⇒ private to its creator.**
2. **Adding an interaction never adds a data path.** Rule 2 (`N7-02`) — *a Widget is not a data silo* —
   is enforced in code: a `WidgetIR`'s `source` is only `{ function }` or `{ entity }` (`ir.ts:151`), and
   there is **no field** for a component/style/query. So a tenant-authored Business Widget **cannot**
   smuggle a new query, a new table, or new code — it can only **re-present** data a Function or an
   entity already governs, **under that Function's/entity's permissions**. This is the single most
   important structural fact in this SRS: **the tenant route is safe because the object it creates has
   nowhere to put anything dangerous.**

---

## §5 — The three extension routes, specified (C5, C6, C7)

### Route 1 — Platform-shipped (BUILT; carries today's extensions)

**What it is.** A developer adds files to a module under the fixed convention and the generator picks them
up at build.

```
modules/<mod>/widgets/injection/<name>/widget.ts        ← declarative or component export
modules/<mod>/widgets/injection-table.ts                ← spot → widgetId [+ priority/placement]
   ↓ (build) packages/cli .../generators/extensions/injection-widgets.ts
injection-widgets.generated.ts / injection-tables.generated.ts
   ↓ (bootstrap) registerCoreInjectionWidgets / registerCoreInjectionTables
the loader resolves per spot, gates by features/requiredModules, the shell mounts
```

**Allowed:** everything — component widgets, declarative widgets, overrides, new spots.
**Gated by:** the build (a human reviews the diff) and, at runtime, `metadata.features` +
`metadata.requiredModules` (`injection.ts:160-185`; enforced `injection-loader.ts:465-475`, `:524-536`)
and `InjectionSpot`'s feature gate (`InjectionSpot.tsx:67-83`).
**Carrier:** the generator + loader above.
**Status:** **BUILT.** This is how every widget in the product exists today.

### Route 2 — Tenant-authored (NEW; declarative-only)

**What it is.** A user, in the product, creates a **Business Widget** — a panel with a title, an IR type
(chart/grid/metric/detail…), an input list, and a **source** pointing at a Function they may run or an
entity they may read — and **places** it. No file is written; no component is compiled. The widget is
**rows** (in the Business Widget registry/document store, `business-widget/document.ts` — the
`companai.business-widget` v1 envelope) plus a **placement** (B5's join).

**Why this is the *only* safe tenant route.** Because the artefact is an **IR**, and the IR has no slot
for code (`§2g`, `ir.ts:171`). The tenant is choosing *"show THIS function's result as a chart, titled
this, with these inputs"* — never *"run this code"*. The renderer is **ours**; the tenant supplies
**content**.

**What it must carry, and why.** Per the vision §LIX's manifest (§195) and our `BusinessWidget`
(`types.ts:288`), a tenant-authored widget must declare at least: **owner** (§38), **purpose** (§38),
**source** (function/entity), **inputs/outputs** (typed, §195), **permissions** (read/interact/execute/
share), **dependencies** (so §114's graph works), and — **required for this route** — a declared
**trust level of TENANT or PERSONAL** (`N7-51`).

**Gated by (all four, and this is where DP-04's two-gate rule lands):**

1. **On the way in** — the user must hold the permissions that **every** Function/entity the widget's
   source touches requires. (This is DP-04's *"does this user have the rights needed to request this"*.)
2. **On the way back** — before the widget is shown to **anyone else**, the viewer's own permissions are
   re-checked against the same set. (DP-04's *"does the user have all the rights required to see this
   outcome"*.) The structural law `N7-16` (*"Widget permissions never replace business authorization"*)
   and `N7-58` (*"sharing a Widget does not automatically share the underlying raw data"*) both reduce to
   this: **the widget's audience is an intersection, computed per view, not a grant stored once.**
3. **Private by default** — a tenant-authored widget with no permission set is **visible to its creator
   only** (owner's DP-02, verbatim). Opening it to others is a **separate act by someone authorised to
   grant** (DP-04's "a place that lists all functions and their permission settings").
4. **No new spot, no new IR type, no override.** A tenant may place into **existing** spots and compose
   from **existing** IR types. Wanting a new spot or a new IR type is a **platform** change — which is
   the correct escalation, not a workaround.

**Carrier:** the `business-widget` registry + document (built, G-07) **plus** the two things it lacks —
**persistence** (the row, `CC-32`-class) and **the join to a spot** (B5 §5). **Status: NEW**, and every
piece it needs is named.

### Route 3 — AI-proposed (BUILT as candidates; the apply-step is the new part)

**What it is.** The AI produces a **patch** (§79–81) or an **IR**, exactly as the vision demands
(`N7-20`). For the **common** case — *"build me a widget that shows overdue customers"* — this is already
the prompt→Function→Widget chain (B4, B5), and the AI's output is a **`FunctionCandidate`**, not an
applied change. The AI **proposes**; a **human confirms** the consequential ending (owner's already-made
decision, `discussion_points.md`: *"the platform proposes a prompt's ending; the user confirms the
consequential ones"*).

**The new part** is the **apply step for a workspace patch** (add/move/resize/bind a widget). The vision
splits it cleanly (§80): *AI proposes → **Workspace Runtime** validates and applies*. In our terms:

- The **validator** reuses what exists: canonical-id check (`kernel/canonical-id.ts` `ID_PATTERN`), IR
  validity (`ir.ts`'s vocabulary guard), the registry's collision rule (never merge, report —
  `registry.ts` `collisions()`), and dependency/reference checks.
- The **gate** is DP-04's two gates plus **§121–122's sandbox**: an AI-generated widget is previewed with
  **synthetic / masked / read-only** data before publication, and *"no production mutation"* happens in
  the sandbox.
- The **trust level** of an AI-proposed widget is **at most the proposing user's** (cap TENANT/PERSONAL),
  never SYSTEM/FIRST_PARTY. `N7-39`: a high-risk action needs **explicit authorization and audit** —
  §103–105's separation (activity ≠ audit) applies.

**Allowed:** propose any patch op; propose a Function; propose a widget graph (§136–137).
**Never:** apply without validation; exceed the user's scope; publish; mutate production in the sandbox.
**Carrier:** `request-outcome` (built) + the patch validator (NEW) + the sandbox (NEW) + DP-04's gates.
**Status:** propose-half **BUILT** (candidates, triage, gate); apply-half **NEW**.

### Route comparison (the exit gate's table)

| | Route 1 — Platform | Route 2 — Tenant | Route 3 — AI |
|---|---|---|---|
| **Author** | us | a user | the AI, as the user |
| **Trust ceiling** | SYSTEM / FIRST_PARTY | TENANT / PERSONAL | TENANT / PERSONAL |
| **Artefact** | files (component **or** declarative) | **declarative IR only** | a proposed patch / IR / candidate |
| **Carrier** | generator + loader (**built**) | `business-widget` registry+doc (**built**) + persistence & join (**new**) | `request-outcome` (**built**) + validator + sandbox (**new**) |
| **Gate** | build review; runtime `features`/`requiredModules` | **permission on the way in AND on the way back**; private-by-default | the above **+ sandbox preview + human confirm** |
| **Needs a deploy?** | **yes** | **no** — content, not code | **no** |
| **May ever run code?** | yes (ours) | **never** | **never** |

---

## §6 — Why the tenant route cannot be a "live file", and what it is instead (C8)

The tempting shortcut is *"let a tenant drop a `widget.ts` and hot-load it."* **It is refused, and the
refusal is structural, not cautious:**

1. **Discovery is build-time.** The generator walks the module tree at build (`§2d`); there is no runtime
   file watcher for tenant content, and adding one would be a **code-execution** surface in a
   multi-tenant server.
2. **A component widget *is* code.** `widget.client.tsx` is a React component (`injection.ts:245`).
   Serving tenant-supplied React from the platform's origin is arbitrary code in the session of every
   user who opens it.
3. **The vision forbids it.** `N7-20`: *"AI generates Widget IR / patches, **not arbitrary UI code**."*
   What is forbidden to the AI is at least as forbidden to an untrusted tenant.

**So route 2 is *content over a fixed renderer*:** the tenant writes rows (IR + placement), our renderer
renders them, our runtime enforces permissions per view. **This is not a limitation — it is the same
guarantee that makes the AI route safe**, and it is why the two routes share one carrier.

---

## §7 — The exit gate, met (business-agnostic)

The gate: *"the SRS separates three extension routes — platform-shipped, tenant-authored, AI-proposed —
and states for each what is allowed, what must be gated, and which existing mechanism carries it."*

**Done, and here is the business-agnostic walk-through — no ERP module named.** Take an arbitrary
organisation that tracks **field-service visits** (invented; it could be *any* noun):

1. **Platform ships a new tool** (Route 1): a developer adds `widgets/injection/visit-map/widget.client.tsx`
   (a map component — code, so only we may do this) and one line in `injection-table.ts`:
   `'detail:visits.visit:panels': 'visits.injection.visit-map'`. **Deploy → the panel appears wherever
   that spot is mounted.** *Carrier: generator + loader. Gate: build review + `features`.*
2. **A tenant adds a widget** (Route 2): a user runs a prompt → saves a Function (*"visits without a
   follow-up in 7 days"*) → the save dialog records a **placement** (`team.reports.followups`, B5 §5) →
   the projector emits a menu item whose **group is derived from the path** (`team.reports`) → the shell
   creates the group if absent (B5 §2b). **No deploy.** The user may also compose a second Business Widget
   over the *same* Function as a chart (IR type `chart`, source `{ function }`). *Carrier:
   `business-widget` + the join. Gate: permission in + permission back; private by default.*
3. **The AI proposes the same thing** (Route 3): the user types *"add a panel that flags overdue visits."*
   The AI returns a **candidate** (not a saved object). The platform runs the validator, previews it in the
   **sandbox** with masked rows, shows the user the diff (`Added: 1 Widget, 1 Function, Permissions: 1`),
   and on confirm **the platform** publishes it — as the user, at tenant scope. *Carrier: `request-outcome`
   + validator + sandbox. Gate: sandbox + human confirm + the two gates.*

In **all three cases**, the wiring that makes it appear is the **same** mechanism measured in §2e — the
spot/menu extension surface. **Nothing in the route depends on field-service, or on any ERP concept.**
That is the owner's *"organic and core, not dependent on a business functionality"* test, passed.

---

## §8 — What this hands to B8–B10

- **B8 (the reference-system decision).** The three systems help at different *layers*: **Paperclip's**
  contribution is the *"what is happening, does it need me, what do I do about it"* control-plane — which
  is route 3's **feed and human-confirm** surface; **Buzz's** contribution is a **workspace where humans
  and agents build together on a relay you own**, with branches-as-channels — relevant to *who may
  extend*; **OpenRig's** contribution is a **local daemon team** — the least relevant to a multi-tenant
  hosted product. B8 should decide **which layer** each informs, not pick one winner for everything.
- **B9 (the widget architecture end to end).** B9 inherits B7's **carrier** (`business-widget` registry +
  IR + the UMES spot/menu surface) and must place the **renderer** boundary explicitly: the kit renders;
  the IR describes; neither knows an ERP concept.
- **B10 (the mapping).** The mapping table gains rows: *Route 2 persistence* → `CC-32`-class; *the join* →
  B5 §5; *the patch validator + sandbox* → NEW items to name; *the reference layer `@`/`#`* → `G-09`.
- **DP-04 (permissions).** This batch **sharpens** DP-04's first requirement: the two gates are not a
  policy — they are the **load-bearing safety property of route 2**. B-perms should take *"a widget's
  audience is an intersection computed per view"* as an explicit test case.

---

## §9 — Corrections and open questions

### The hostile-critic round (separate agent, command + output per claim — RAN)

A **separate agent** attacked the evidence in this file. **25 claims were checked; 19 held; 6 failed.**
Every failure was confirmed by a second command run by the author and **fixed in place** (rule 13). The
failures were: (1) the systematic rule↦§ citation conflation; (2) "two sidebar spots" → **five**;
(3) the bootstrap file misattribution; (4) `"No production mutation"` misplaced from §119 into §121–122;
(5) the example table's **two**-flag gate presented as one; (6) a loose `:8`–`:9` range. **Notably, every
code-side line number and method name held** — the errors clustered entirely in the *vision* citations
(where rule numbers were read as §-numbers) and in one count. Full detail in the corrections list below.

### Corrections made while measuring (rule 13)

**From the separate-agent hostile-critic round (6 findings, all confirmed and fixed in place above):**

1. **A systematic rule↦§ conflation in the vision citations.** `N7-01…N7-40` are the **40 rules**
   (Part LXXIII) and their number is the **rule's number**, *not* a §-number; `N7-41…N7-60` are body
   statements whose number **is** the §. Earlier drafts wrote *"N7-20 (§20)"*, which points at §20
   *"Communication widgets"* — the wrong anchor. **Fixed in §2h and §3**, with an explicit citation note
   so the trap cannot recur. (The section-numbered ones — `N7-49/50/51/52/54` = §110/111/124/125/139 —
   were already correct.)
2. **"two of them the sidebar" was wrong — there are FIVE sidebar spots.** Verified by
   `grep "spotId={" AppShell.tsx | grep -c SIDEBAR` → 5 (lines 976, 1020, 1141, 1147, 1153). **Fixed in
   §2e.** *Lesson: a count is a claim about a scope — name the scope.*
3. **The bootstrap registration was misattributed.** The calls are in
   `apps/mercato/src/components/ClientBootstrap.tsx:45-46` and `packages/shared/src/lib/bootstrap/factory.ts:151`
   — **not** in `apps/mercato/src/bootstrap.ts` (which only imports the tables). **Fixed in §2d.**
4. **`"No production mutation"` is §119 (Preview), not §121–122.** §121–122 is the **sandbox**;
   the phrase sits just above it. **Fixed in §2h.**
5. **The example table's gate uses TWO flags, not one** — `NEXT_PUBLIC_OM_EXAMPLE_INJECTION_WIDGETS_ENABLED`
   **or** `NEXT_PUBLIC_OM_CRUDFORM_EXTENDED_EVENTS_ENABLED` (`injection-table.ts:123-124`). **Fixed in
   §2c.**
6. **"the four `type` literals are on `:8`–`:9`" was loose** — all four are on the single line `:8`.
   **Fixed in §2a.**

**Corrections made while measuring, before the critic:**

1. **"The kit has no extension system" would be false.** Measured: UMES enumerates four extension types
   including `injection-widget` (`umes/collector.ts:8`). Any earlier note implying extension is greenfield
   is corrected here: **the extension system exists and is in use.**
2. **"Adding a widget is always a deploy" is *nearly* true but must be stated precisely.** A new **file**
   needs a build; a new **table row referencing an existing widget** *also* needs a build, because the
   table is **generated** (`injection-widgets.ts:192`). Correct statement: *the set of extensions is fixed
   at build; the rendering is live.*
3. **`InjectionDataWidgetModule` is at `injection.ts:450`, not `:435`** (B5's correction carried forward;
   `:434` is `InjectionBulkActionWidget` — re-verified by the critic, HOLDS).

### Open questions for the owner (rule 11 — the owner decides *what* to build)

**OQ-B7-1 — Is the tenant route in scope for the first build, or do we ship routes 1 and 3 first and add
tenant authoring when DP-04's permissions layer exists?**
*Why it matters:* route 2's whole safety case **is** the two gates, so building it before B-perms means
building the gate twice. Recommendation: **specify all three now (this batch); build route 1 and the
propose-half of route 3 on what exists; build route 2 behind B-perms.** One question: *do you want route 2
(tenant authoring) held until the permissions workstream lands, or built earlier with a private-only gate?*

**OQ-B7-2 — Does a tenant-authored widget need a review step before *anyone else* sees it, or is
"permission-gated + private-then-shared" enough?**
*Why it matters:* this is the vision's **change-class** rule (`N7-49/50`) — a layout change is safe, a
new dependency needs review. A tenant widget that only **re-presents** an existing Function adds **no new
dependency**, so it arguably needs no review; one that **binds a new Function** does. Recommendation:
**review is triggered by the change class, not by "it is tenant-authored"** — no review for pure
re-presentation; review when a new dependency/command/permission enters. One question: *should a tenant
widget that only re-shows an existing Function be usable immediately, with review reserved for widgets
that introduce a new dependency or permission?*

**OQ-B7-3 — Who owns a widget when its author leaves the tenant?**
*Why it matters:* the vision insists every Widget has a **clear owner** (`N7-38`) and a personal→system
promotion must preserve dependencies (`N7-54`). A tenant-authored widget whose owner is deactivated needs
a defined fate. Recommendation: **an ownerless personal widget is retained but not shared; an orphaned
TENANT widget is flagged for an admin.** One question: *when a widget's author is removed, should their
personal widgets be archived, reassigned, or offered to an admin?*

---

## §10 — What this batch read, and what it deliberately skipped

**Read (with the reason):**

- `packages/shared/src/modules/widgets/{injection, injection-loader, component-registry}.ts` — the
  contract, the loader, and the override mechanism. **The three files this batch is about.**
- `packages/cli/src/lib/umes/collector.ts` — the UMES extension taxonomy. *(head + exports read; the
  per-type collector bodies were scanned, not read line-by-line.)*
- `packages/cli/src/lib/generators/extensions/injection-widgets.ts` — **the generator**, i.e. the proof
  that discovery is build-time. *(the output-file and resolve-file lines were read; the emit bodies were
  not.)*
- `apps/mercato/src/modules/example/widgets/**` — the canonical authoring template: `injection-table.ts`,
  a declarative widget (`example-menus`), a component widget, and a dashboard widget (`welcome`).
- `packages/shared/src/lib/business-widget/{types,ir,registry}.ts` — the semantic object an extension
  produces and the registry that versions it.
- `library/analysis/findings/04-vision-workspace.md` §15a/§15b and the `N7-*` extension rows.
- `library/ai/ai-first/05_Widgetized_Collaborative_Workspace_Architecture.md` — Part IV (types §16–23),
  Part XVIII (patch §79–81), Part XXVII (registry §112–114), Part XXX/XXXI (sandbox §121–122, security
  §123–125), Part XXXV (low-code §135–137), Part LVIII/LIX (marketplace §194, manifest §195), Part LXXIII
  (the 40 rules).

**Deliberately skipped (with the reason):**

- **The `dist/` copies** of every module's `widgets/` — generated output, not source (`§2a` counts 64
  `widgets/` dirs of which roughly half are `dist/`).
- **AppShell/InjectionSpot internals** — measured exhaustively in **B5** (`02-SRS-03` §2a–§2b); re-read
  only to confirm the two rendering sinks.
- **The patch-execution machinery** — does not exist yet; the vision describes it (§80), our code does not
  implement it, and inventing it here would repeat exactly the mistake rule 0b guards against.
- **`sync_excel` / `translations` / other modules' widgets** — the convention is uniform; the example
  module is the canonical template and was read instead.

---

## §11 — Exit gate

| Requirement | Status |
|---|---|
| The SRS separates **three routes** (platform / tenant / AI) | ✅ §5, one subsection each |
| For each: **what is allowed** | ✅ §5 (each route's "Allowed") + §4's author table |
| For each: **what must be gated** | ✅ §5's "Gated by" + §7 + DP-04's two gates |
| For each: **which existing mechanism carries it** | ✅ §5's "Carrier" + the comparison table |
| **Business-agnostic** demonstration | ✅ §7 (invented noun; no ERP module) |
| Measured, rule 0b | ✅ §2 (a–h), each with a command/path |
| Owner questions raised, not closed (rule 11) | ✅ §9, OQ-B7-1/2/3 |
| Corrections recorded (rule 13) | ✅ §9 (3 items) |

**Gate: PASSED** — the separate-agent hostile-critic round ran (25 claims, 6 findings, all fixed in place
in §2 and §9). This batch is marked done in the README.

---

*Created 2026-10-11. Batch B7 of the workspace-architecture workstream. Owner: Ramzi.*
