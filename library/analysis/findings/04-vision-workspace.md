# Batch 4 — The vision: the workspace

**Batch:** 4 of 12 · **Status:** complete · **Date:** 2026-10-04
**Input:** vision **Document 7** (`05_Widgetized_Collaborative_Workspace_Architecture.md`,
4,826 lines).
**Also measured this batch:** the starting-kit front end (`workspace/starting-kit/`,
Open Mercato 0.6.7) and the vision README (§14 precedence rule, §15 undecided list, §7
description of Document 7).
**Question this batch answers:** What replaces "a chat screen with some UI controls bolted
on" — and what does that demand of our front end?

**Definition of done (from `PLAN.md`):** *a reader can say what the workspace is made of,
and what a front end must support to be part of this platform rather than beside it.*

---

## 0. How to read this report

Same conventions as batches 2 and 3. **`N7-nn`** are numbered normative statements sourced
to Document 7. Counts are measured by script, not estimated. The one comparison this batch
exists to make — vision Widget vs our front end — is in **§15**, and the attempt to break
the document's authority is in **§17**.

---

## 1. What was read, and how big it is

| Source | What it is | Size |
|---|---|---|
| Vision **Document 7** | `05_Widgetized_Collaborative_Workspace_Architecture.md` | **4,826 lines** |
| Vision **README** §14, §15, §7 | precedence rule, undecided list, Doc 7 description | 3 sections |
| Starting-kit front end | `workspace/starting-kit/` — Open Mercato 0.6.7 | measured in §15 |

Document 7 measures out as: **74 parts**, **224 numbered sections**, **40 non-negotiable
widget rules** (Part LXXIII, numbered 1–40), **8 widget-type families**, and **7
anti-patterns**. It is the longest single document after Document 8, and the only one that
describes what a user sees.

---

## 2. What Document 7 is, and how it connects to the rest

### 2a. Its one-line claim

> **"Widgets are interaction islands, not data islands."** (Executive Summary, line 57)

A Widget may own its interaction state and presentation, but it must reference the canonical
Business Model, canonical entities, governed Functions/Queries/Commands, the authorization
system, and shared workspace context. Everything in the document follows from that sentence.

### 2b. Where it sits

The README places Document 7 as the **workspace / interaction** layer, read after the data,
Hermes, local-AI and schema-evolution documents. Document 7 itself (Part LXXI, §217–224)
names the seven runtimes and what each defines:

| Runtime | Defines |
|---|---|
| Business Model Kernel | what the business means |
| Business IR | what business operation is requested |
| Function Engine | how a reusable operation executes |
| **Widget Runtime** | **how a user interacts with an operation** |
| **Workspace Runtime** | **how multiple interactions are organised and connected** |
| Hermes | how AI reasons and orchestrates |
| Model Runtime | which inference engine supplies intelligence |
| Data Plane | where authoritative state and derived data live |

So Document 7 **adds two runtimes** (Widget, Workspace) to the set established in Documents
4 and 5. It does not re-decide the others; it consumes them.

### 2c. Precedence, applied

The vision's own rule (README §14) ranks invariants above "later refined subsystem
architecture" above "earlier architecture". Document 7 **is** the latest refined subsystem
for the workspace, and nothing in the set supersedes it. Two things follow:

- Its **40 non-negotiable rules** (Part LXXIII) are the highest-precedence statements about
  the workspace, and later batches are held to them.
- The **precedence rule drops nothing** here — there is no earlier workspace document to
  contradict. The only "earlier architecture" it refines is the general idea of a workspace
  containing chat + table + form (Document 7 §1 replaces that with "workspace contains
  Widgets").

### 2d. README §15 matters for this batch

The README's "deliberately NOT decided" list (line 896) includes **"exact frontend
framework"**. That is the single most important line for batch 4: **the vision is
framework-agnostic on purpose.** Our front end (Next.js/React, via Open Mercato) is not
contradicted by the vision — it is simply undecided, and is therefore ours to keep or change.

---

## 3. The thesis, and the five principles

### 3a. Workspace is not chat (Part I, §1–4)

The document rejects `Workspace = Chat + Table + Form + Chart + Document` and replaces it
with `Workspace → Widget Runtime → Widgets`. A Widget is a **coherent business activity**
("Customer Investigation", "Accounts Receivable", "Purchase Approval"), not a visual building
block. A Widget is **not** a module either: a module is a business-domain boundary; Widgets
are "the runtime interaction surface for capabilities". Hence the chain:

```
Capability → Functions / Commands / Queries → Widgets → Workspace
```

### 3b. The five principles (Part II, §5–9)

1. **Isolation of interaction, not isolation of truth** (§5). A Widget owns filters,
   selection, draft values, layout, local conversation — but never an authoritative copy of
   Customer/Invoice/Product/Employee/Payment/Organization.
2. **Typed contracts** (§6). Every Widget declares inputs, outputs, actions, events,
   dependencies, permissions, state, collaboration support, persistence.
3. **Semantic UI, not model-generated UI code** (§7). AI produces a semantic Widget
   definition; the renderer turns it into UI. It does **not** emit React source unless the
   user is explicitly in a developer environment.
4. **Shared business model** (§8). Widgets consume entities/fields/relationships/metrics/
   Functions/Commands/Workflows/Policies from the Business Model Kernel.
5. **Direct use and composition must both work** (§9). The same Widget opens directly, embeds
   in another Widget, embeds in another Workspace, is referenced in a conversation, appears
   in a dashboard, is scheduled, shared, forked — without creating unrelated copies of its
   business logic.

These five are the whole design in miniature. §5 and §9 are the two that will constrain our
build hardest.

---

## 4. The widget contract (Part III, §10–15)

A Widget declares **five contract parts**:

| Part | § | Content |
|---|---|---|
| Inputs | 11 | typed: `CustomerRef`, `DateRange`, `Currency`, `FilterSet`, `RecordSelection`… |
| Outputs | 12 | typed: `CustomerRef`, `InvoiceRef[]`, `MetricResult`, `TableResult`, `ChartData`… |
| Actions | 13 | refresh, filter, select, open, edit, execute_function/command, start_workflow, share… |
| Events | 14 | `customer.selected`, `period.changed`, `function.executed`, `record.updated`… |
| Dependencies | 15 | entities, fields, relationships, metrics, Functions, Commands, Workflows, Policies, Knowledge, Skills, **other widgets** |

The document is explicit that the **serialization format is an implementation decision** — the
*contract* is the architectural requirement (§10). Inputs can arrive from a user, a Function
parameter, workspace context, another widget's output, a deep link, saved state, an AI
proposal, or a scheduled execution (§11). The dependency list feeds "the platform's
dependency graph" (§15) — the same graph Document 5 established.

---

## 5. Widget types — the eight families (Part IV, §16–23)

| # | Family | § | Examples |
|---|---|---|---|
| 1 | Atomic | 16 | Metric, Text, Input, Button, Status, Badge, Reference |
| 2 | Data | 17 | DataGrid, EntityList, EntityView, Timeline, Calendar, Kanban, Tree, Graph, Map |
| 3 | Analytical | 18 | Metric Card, Pivot, Chart, Trend, Funnel, Cohort, Waterfall, KPI Board… |
| 4 | Functional | 19 | Customer Investigation, Purchase Approval, Collections Desk… |
| 5 | Communication | 20 | Conversation, Comments, Activity Feed, Decision Log, Mentions… |
| 6 | Document | 21 | Document, PDF viewer, Document comparison, Evidence panel |
| 7 | Collaboration | 22 | Shared Notes, Decision Board, Task Board, Approval Panel, Live Review |
| 8 | Structural | 23 | Tabs, Split Pane, Stack, Container, Grid, Section, Accordion, Dock |

**Structural widgets are composition primitives, not business widgets** (§23) — the only
family that is pure layout. The other seven all carry business meaning, which is why the
"interaction island, not data island" rule binds them.

---

## 6. The state model — three levels, and two separations (Part V, §24–27)

### 6a. Three state levels (§24)

| Level | Examples | Owner |
|---|---|---|
| **Local Widget State** | filters, sorting, selection, draft values, expanded sections | the Widget |
| **Shared Workspace State** | active customer, selected date range, shared filters, participant context | the Workspace |
| **Business State** | `invoice.status`, `customer.credit_limit`, `inventory.quantity` | **the Business Platform** |

### 6b. Draft is never business state (§25)

Typing `€100,000` into a credit-limit box does **not** mean `Customer.credit_limit =
€100,000` until a valid business **Command** executes. This is the same rule Document 4
stated from the Function side, restated here from the screen side.

### 6c. Live vs snapshot, and it must be visible (§27)

A Widget is either **LIVE** (resolves its data source on open/refresh) or **SNAPSHOT**
(preserves historical state). The distinction "must be visible in the UI". Persistent Widgets
serialize `widget_instance_id`, `widget_definition_id`, `widget_version`, `state_version`,
`layout_state`, `parameter_values`, `selection`, `workspace_context_bindings` — but **never
authoritative business data** (§26).

---

## 7. Widgets and Functions — behaviour vs interaction (Part VI, §28–32)

The core rule (§28):

```
Function = "What operation should happen?"
Widget   = "How should a human interact with that operation?"
```

- A **Function can exist without a Widget** (§30) — as a button, command, scheduled job, API
  operation or automation.
- A **Widget can exist without a Function** (§31) — a read-only Widget may query a canonical
  View/Entity directly.
- A **Widget can host multiple Functions** (§32) — e.g. a Collections Widget with
  `overdue_customers`, `create_collection_task`, `register_payment`, `send_reminder`.

This is the same Function/Widget boundary Document 4 drew, from the other direction, and it
is rule 14 in the non-negotiable set.

---

## 8. Widget IR (Part VII, §33–35)

Document 7 introduces **Widget IR** as the workspace counterpart of Business IR:

- Business IR answers *"what should the business system do?"*
- **Widget IR answers *"what should the workspace present, and how should the user interact
  with it?"***

The example (§34) is a `data_grid` of overdue customers, sourced from
`fn_overdue_customers`, with typed inputs (`Country`, `Money`) and actions
(`open_customer`, `create_collection_task`). **Widget IR must remain semantic** (§35): no
React props, CSS classes, DOM structure or browser-specific code, unless the Widget is
explicitly a developer component. This is the same IR-not-code discipline as Documents 3/4,
applied to the UI layer.

---

## 9. Composition and typed ports (Part VIII, §36–41)

- **Tree vs graph** (§36–37). The **tree** is visual composition (a Widget contains child
  Widgets). The **graph** is behavioural relationships (Widget A produces → Widget B filters
  → Widget C). "These are not necessarily the same structure."
- **Typed ports** (§38). INPUT / OUTPUT / EVENT / ACTION ports, each typed.
- **Binding** (§39). Another Widget binds to `CustomerWidget.customer.selected` — "a typed
  visual dataflow".
- **Canonical references, not raw JSON** (§40). Prefer `CustomerRef(customer_id)` over a
  literal `{name, country}` blob; the latter is only a display projection.
- **Communication mechanisms** (§41): direct typed port, workspace event, shared context
  binding, Function result, canonical object reference. "Avoid arbitrary widget-to-widget
  scripting as the normal mechanism."

---

## 10. Independent usage and the three reference modes (Part IX, §42–47)

A Widget is **a first-class addressable object** (§42), with a stable URI
(`workspace://tenant/widget/…`; the exact syntax is an implementation detail). It can be
**opened** alone (§43), **embedded** in other workspaces/dashboards/conversations/documents
(§44), and **shared** into another conversation (§45).

**References are live by default** (§46) — not copied static data — unless the user chooses
Snapshot. Three modes (§47):

| Mode | Meaning |
|---|---|
| **LINK** | same underlying Widget object; all instances reflect changes |
| **INSTANCE** | new instance of the same definition; same behaviour, different parameters/state |
| **SNAPSHOT** | frozen representation; no live synchronisation |

The Definition/Instance split (§63) is the Figma component/instance analogy, cited as
evidence (§63, §46, §170–172).

---

## 11. The `@` / `#` reference system — and our kit, compared

### 11a. What Document 7 specifies (Part X, §48–52; Part XLVII, §164–166)

| Syntax | Means |
|---|---|
| `@person`, `@agent`, `@team`, `@group` | participants (people and agents) |
| `#widget`, `#function`, `#workspace`, `#document`, `#report`, `#task`, `#view`, `#dashboard` | reusable platform objects |

- `@` already means person/agent/group/participant; `#` is reserved for "named reusable
  object" (§49). Example: `@Sarah review #supplier-risk with @FinanceAgent`.
- Typing `#` opens a **context-aware picker** (Widgets, Functions, Reports, Documents,
  Workspaces, Tasks, Views, Dashboards); typing `@` opens People/Agents/Teams/Groups.
  **Permission filtering occurs before objects are displayed** (§50).
- **Resolution order** for `#something` (§165): exact user-owned → team → organisation →
  tenant → system, subject to permissions.
- **Ambiguity is surfaced, not guessed** (§166): if several objects match `#sales`, show the
  list; "the AI should not arbitrarily choose among ambiguous objects".

### 11b. What our starting-kit actually has (measured)

| Thing | In the kit? | Where / what it really is |
|---|---|---|
| `@` mention of people/agents | **Only cosmetically** | `packages/ui/src/primitives/rich-editor.tsx` — the `@` button runs `exec('insertText', '@')`. It inserts a literal character. **No picker, no resolution, no handle registry, no agent concept.** |
| `#` object reference | **No** | The only `#` in that editor is CSS hex colours. No `#handle` syntax anywhere. |
| A structured object link | **Yes, but narrow** | The **messages** module links a message to business objects by `{entityModule, entityType, entityId}` with an optional `snapshot` (`packages/shared/modules/messages/types.ts`). |
| A registry for those links | **Yes, but empty** | `messages/lib/message-objects-registry.ts` exists, but the shipped default list `messages/message-objects.ts` is **`[]` — zero registered types**. It is a framework waiting for modules to register into. |
| A platform-wide object resolver | **No** | No slug/handle addressing for business objects; `slug` in the kit is for URLs/auth, not object references. |

### 11c. The comparison, plainly

**The vision's `@`/`#` layer is a new build, not an upgrade of something we have.** What the
kit gives us is (a) a cosmetic `@` button and (b) a *message-scoped* structured link with a
snapshot field. The message link is a genuine partial foundation — it already encodes the
"reference an entity by canonical id, optionally with a snapshot" idea — but it is bound to
messages, keyed by `module:entityType`, ships empty, and has none of the vision's free-text
`#` syntax, picker, permission-filtered display, resolution order, or ambiguity handling.

**Consequence:** the reference layer (a canonical object resolver over the Object Registry,
with permission filtering and the `@`/`#` syntax) is a **new subsystem**. It is the single
biggest front-end item the vision asks for that we do not already have. It also depends on the
Object Registry, which the vision says must be extended to widgets (§112) — so the registry
is a prerequisite, not a detail.

---

## 12. Collaboration and concurrency (Parts XI–XIII, XXIII–XXIV)

- **Three collaboration levels** (§53): workspace-wide, around one Widget, and on a specific
  object (comment/decision/task attached to data or content).
- **Human + AI participants** (§54): a workspace can hold `@Sarah`, `@John`,
  `@ProcurementAgent`. Presence (§55) is a collaboration feature, **not** business
  authorization.
- **Comments are anchorable** (§56) to widget / row / cell / chart point / form field /
  paragraph / message / Function / workflow step / business record.
- **Collaborative state vs business state** (§58) — the critical separation. Users collaborate
  freely on filters, notes, layout, annotations, discussion, draft values. Business records
  change **only** through `Business Command + authorization + transaction`. "Do not use
  generic collaborative merging as the authority for financial/operational state."
- **Two synchronisation classes** (§59): CRDT/OT for documents, notes, layout, annotations,
  comments; transactional concurrency (version, optimistic locking, command, transaction,
  postcondition) for invoices, inventory, payments, purchase orders, employees.
- **No last-write-wins for business data** (§60): a conflict on `PurchaseOrder.total` or
  `Customer.credit_limit` is resolved by domain rules, not "last HTTP request wins".
- **Activity vs audit are distinct records** (§103–105): the activity feed is human-friendly
  collaboration history; the audit trail is the authoritative security/business record.
  "John changed a filter" is not the same as "John changed a credit limit".

---

## 13. AI generation, patches, sandbox and security (Parts XVII–XXXI, LVI)

- **Three agent scopes** (§75–77): a **Global Workspace Agent** (workspace goal, widget
  relationships, participants, shared context); a **Widget Agent** (one widget's purpose,
  inputs, outputs, actions, current selection); a **Specialist Agent** (a business capability,
  e.g. Finance/Inventory/HR). Hermes provides the runtime; the platform provides capabilities
  and authorization.
- **Widget AI must not mutate its own contract autonomously** (§78). It may *propose* a
  **Widget Patch Proposal** (add a chart, add an input, change a filter); the platform
  validates and publishes.
- **Workspace Patch** (§79–81): a structured patch language with **13 operations** —
  `ADD_WIDGET`, `REMOVE_WIDGET`, `MOVE_WIDGET`, `RESIZE_WIDGET`, `UPDATE_WIDGET`,
  `SET_PARAMETER`, `SET_SELECTION`, `BIND_WIDGET`, `UNBIND_WIDGET`, `ADD_REFERENCE`,
  `ADD_COMMENT`, `CREATE_TASK`, `PROPOSE_FUNCTION`. **AI uses patches, not frontend code**
  (§80). Patches are themselves collaborative operations (§81) — but business actions still go
  through business transactions.
- **AI-generated workspace proposals are diffable** (§191): show `Added: 6 Widgets`,
  `Connections: 5`, `Functions: 3`, `Permissions: 2`, `New AI capability: 1`, then approve.
- **Sandbox** (§121–122): an AI-generated Widget is previewed with synthetic/masked/read-only
  data before publication; no production mutation.
- **Widget security** (§123–125): a Widget **cannot grant permissions** — it may *request*
  `invoice.cancel`, but the platform decides. Five **trust levels**: SYSTEM, FIRST_PARTY,
  TENANT, PERSONAL, UNTRUSTED. A Widget that calls an external service must declare the
  integration, the data leaving the platform, credentials and permissions.
- **Object-aware data security** (§176): referencing `Customer ACME` still requires
  `user.can_read(Customer ACME)`. **The reference itself is not authorization** (§176).
- **Sharing ≠ sharing data** (§177–178): inserting `#payroll-summary` shares the *reference*;
  the platform evaluates each viewer's access to the underlying data. External live sharing of
  sensitive data is **off by default** (§178).

---

## 14. Lifecycle, versioning, dependency and the registry (Parts XV, XXV–XXVIII, XLVI, LX)

- **Widget lifecycle** (§68): `DRAFT → VALIDATED → PUBLISHED → ACTIVE → DEPRECATED →
  ARCHIVED` (**6 states**). AI-generated Widgets start as a **proposal**, not live
  functionality (§69).
- **Forking** (§70) and a **controlled override model** (§71) — override title/layout/filters/
  columns/actions, but "avoid copying underlying business logic". **Inheritance** runs
  System → Organization → Team → Personal (§72).
- **Dependency graph** (§106–108): a Widget depends on Function/Metric/Entity/Command/
  Workflow/Policy/other Widget. When the model changes (e.g. `Customer.risk_tier`), the
  Dependency Engine finds the affected Widgets/Functions/Skills/Reports/Queries/Commands and
  marks each `valid / recompiled / needs review / invalid`.
- **Widget dependency states** (§197): `VALID`, `RECOMPILE`, `REVIEW`, `BROKEN`, `DEPRECATED`
  (**5 states**) — the widget-level mirror of Document 5's impact classes.
- **Versioning** (§102, §161–163): live references follow the published version subject to
  policy; a user may **pin** a version for reproducibility; **no silent semantic change** —
  if a displayed metric's meaning changes, historical snapshots stay tied to their previous
  version.
- **Workspace Object Registry** (§112–114): Widgets are first-class registry objects
  (`object_type = widget`, id, version, owner, scope, status, dependencies, permissions). One
  canonical `widget_id` across all placements; instances carry `widget_instance_id`. The
  registry must answer "Where is this Widget used? What does it depend on? Who has access?".
- **Widget package** (§115–116): a reusable widget can be packaged with manifest, definition,
  child widgets, Business IR references, Functions, UI schema, collaboration schema,
  permissions, documentation, tests, assets — and **must not duplicate business truth**.
- **Manifest** (§195) and **library categories** (§65, 9 categories) and **6 rendering
  adapters** (Web/Mobile/Desktop/Email/PDF/Embedded, §185) and **7 layout primitives**
  (grid/flex/stack/tabs/split/dock/floating, §186).

---

## 15. The comparison: does our front end line up? (the batch's core question)

`PLAN.md` says: *"Our starting-kit has an Open Mercato front end with its own page and widget
model. Either those two line up, or one of them has to change. This batch finds out which."*

### 15a. What the kit's front end actually is (measured)

| Piece | What it really is | Where |
|---|---|---|
| **Dashboard widget** | `DashboardWidgetModule`: presentation `metadata` (id, title, description, subtitle, features, defaultSize, defaultEnabled, defaultSettings, tags, category, icon, supportsRefresh), a React `Widget` component, and `hydrate/dehydrateSettings`. Settings persist into `dashboard_layouts.layout_json`. | `packages/shared/src/modules/dashboard/widgets.ts` |
| **Injection widget** | A module registers widgets into named **spots** (`crud-form:customers.person:fields`, `data-table:customers.people:columns`, `menu:sidebar:main`, `portal:dashboard:sections`…) with a `widgetId` + `priority`. | `modules/*/widgets/injection-table.ts` |
| **Component override** | Wraps/replaces an existing component by handle. | `widgets/components.ts` |
| **The extension system** | The above is the kit's **UMES** extension system (spot injection + component override). | `.ai/qa/scenarios/TC-UMES-*` |
| **Object link** | Messages link to `{entityModule, entityType, entityId}` + optional `snapshot`; registry ships **empty**. | `messages/*` |

### 15b. The verdict

**They do not line up — and the mismatch is a naming collision over a real architectural
gap.** The kit's "widget" is a **presentation/dashboard extension point**: a React component
in a named spot, with settings and a priority. The vision's "Widget" is a **typed business
interaction object**: a persistent, versioned, addressable registry object with a contract
(inputs/outputs/actions/events/dependencies), a semantic **Widget IR**, a dependency graph,
a lifecycle, permissions, and live/instance/snapshot reference modes.

The kit's model can **host the rendered output** of a vision Widget — it is a working
renderer-extension system, and its spot/override/priority design is a genuine asset. But it
provides **none** of the vision's contract, IR, registry, dependency, or reference machinery.
So the honest answer is:

- **The kit's front end can be the rendering layer.** The vision is framework-agnostic
  (README §15 leaves the frontend framework undecided), so our Next.js/React front end is
  not the problem and does not have to change.
- **The vision's Widget Runtime, Widget IR, Object Registry and `@`/`#` resolver are new
  builds.** They are not extensions of the kit's dashboard-widget model; they sit *above* it.
- **One thing must change: the word.** The kit already calls its dashboard tiles "widgets".
  Two different objects under one name will cause confusion in every later batch. Recommendation
  (carried to batch 9, the map): keep "widget" for the kit's existing dashboard tile, and call
  the vision object a **"Business Widget"** — or rename the kit's tile. This is a naming
  decision, not a code decision, and it should be taken before any build starts.

### 15c. What a front end must support to be *part of* this platform, not beside it

Distilled from the 40 rules and the body:

1. **Render semantic Widget IR** (not generated source code) — the renderer is
   renderer-independent (§184–185).
2. **Resolve `@`/`#`** against the Object Registry, with permission filtering *before*
   display, and surface ambiguity instead of guessing (§50, §165–166).
3. **Keep business state behind Commands/Workflows** — no direct table writes, no
   last-write-wins, no collaborative merge as authority (§25, §58–60, rules 16–17).
4. **Separate collaborative UI state from business state** in both storage and concurrency
   (§24, §58–59, rule 18).
5. **Track widget dependencies** and accept schema-change impact analysis (§15, §106–108,
   rules 26–27).
6. **Treat the reference as not-authorization** — re-check `can_read` on the underlying
   object at render/execute time (§176, rule 24).

---

## 16. The normative register

### Document 7 (N7) — the 40 non-negotiable rules, quoted (Part LXXIII)

**These 40 rules are registered as `N7-01 … N7-40`** (rule *n* = `N7-*nn*`). Quoted verbatim
from Part LXXIII, because they are the highest-precedence statements about the workspace.

> 1. A Widget is a first-class business interaction object.
> 2. A Widget is not an independent data silo.
> 3. Business truth remains in the canonical Business Model / Data Plane.
> 4. A Widget has a typed contract.
> 5. Inputs and outputs are semantic.
> 6. Widget IR describes interaction/presentation requirements, not frontend source code.
> 7. Widget definitions are distinct from widget instances.
> 8. Widgets can operate independently.
> 9. Widgets can compose collectively.
> 10. Widget-to-widget communication uses typed ports, events, references or shared context.
> 11. Canonical EntityRef objects should be used instead of copied business data.
> 12. Live linked Widgets are the default sharing mode.
> 13. Snapshot is an explicit alternative.
> 14. Function = behavior; Widget = interaction.
> 15. Workspace = organization of Widgets.
> 16. Widget permissions never replace business authorization.
> 17. Business mutations always go through Commands/Workflows.
> 18. Collaborative editing is separate from business transaction execution.
> 19. CRDT/OT-style mechanisms belong to collaborative document/layout state, not authoritative business transactions.
> 20. AI generates Widget IR / patches, not arbitrary UI code.
> 21. AI should receive Widget-scoped context whenever possible.
> 22. General chat can reference Widgets using #.
> 23. People/agents should be referenced using @.
> 24. Widget references respect underlying data permissions.
> 25. Widgets are versioned.
> 26. Widget dependencies are tracked.
> 27. Schema/business changes trigger Widget impact analysis.
> 28. Widgets can be embedded in conversations, documents, dashboards and other Workspaces.
> 29. Widget libraries are UX over a canonical Object Registry.
> 30. Widgets can be forked without duplicating business truth.
> 31. Widget outputs can become documents, tasks, decisions or Functions.
> 32. Workspace activity and business audit are distinct records.
> 33. Widget definitions should generate documentation where possible.
> 34. Widgets should support responsive and accessibility-aware rendering.
> 35. Widget runtime should be renderer-independent.
> 36. Widget graphs should be inspectable.
> 37. Database islands must not be reproduced as Widget islands.
> 38. Every Widget should have a clear owner, purpose and dependency graph.
> 39. Every high-risk Widget action must have explicit authorization and audit.
> 40. The end state is a composable collaborative business application, not a dashboard collection.

### Document 7 (N7) — 20 further normative statements from the body

| ID | Statement | § |
|---|---|---|
| N7-41 | A Widget participates in three state layers: local widget state, shared workspace state, business state. | 24 |
| N7-42 | A draft input value is not business state until a valid Command executes. | 25 |
| N7-43 | Live vs snapshot state must be visible in the UI. | 27 |
| N7-44 | Permission filtering happens before objects are shown in the reference picker. | 50 |
| N7-45 | Collaboration exists at three levels: workspace, widget, and object. | 53 |
| N7-46 | Business concurrency is resolved by domain rules, not last-write-wins. | 60 |
| N7-47 | A Widget may have narrower sharing than its Workspace. | 99 |
| N7-48 | Layout/title/icon changes are safe Widget changes. | 109 |
| N7-49 | A new dependency/command/permission/metric/integration requires review. | 110 |
| N7-50 | Removing a required input/output, or changing semantics/Function/authorization, is a breaking change. | 111 |
| N7-51 | Widgets have trust levels: SYSTEM, FIRST_PARTY, TENANT, PERSONAL, UNTRUSTED. | 124 |
| N7-52 | External integrations must declare the integration, the data leaving the platform, credentials and permissions. | 125 |
| N7-53 | Keep AI context compact (metadata + typed refs + small results) — this is what makes local models viable. | 128 |
| N7-54 | Promoting a personal Widget to a system capability must preserve or replace its dependencies. | 139 |
| N7-55 | No silent semantic change: historical snapshots stay tied to their previous version. | 163 |
| N7-56 | Reference resolution order: user → team → organisation → tenant → system, subject to permissions. | 165 |
| N7-57 | The AI must not arbitrarily resolve an ambiguous reference. | 166 |
| N7-58 | Sharing a Widget does not automatically share the underlying raw data. | 177 |
| N7-59 | External live sharing of sensitive business data is off by default. | 178 |
| N7-60 | Cache deterministic Widget results with explicit freshness; never cache authoritative mutations. | 182–183 |

**Total for Document 7: 60 statements (40 + 20).**

### Agreement with earlier batches

Document 7 restates, independently, rules already registered: draft-vs-business state
(N7-42 ≈ N4-33); business mutations via Commands (N7-17 ≈ N4-29 ≈ N5-18); IR-not-code
(N7-06/N7-20 ≈ N4-31 ≈ N5-35); dependency tracking and schema-change propagation (N7-26/N7-27
≈ N5-20/N5-22); canonical references not copied data (N7-11 ≈ N5-07); permissions below the
AI (N7-16/N7-24 ≈ N5-20 ≈ R-08). **This is now the fifth document in the set to converge on
the same small set of rules** — which is the strongest available evidence that the set is
one design, not nine.

---

## 17. Critic pass — is this "a UI design wearing architecture clothes"?

**The attempt, named.** I tried to show that Document 7 is a **UI/UX design document** whose
"architecture" vocabulary is decoration, and that **nothing in it constrains the platform**.
Method: strip every sentence that is only about screens, and see whether any *backend*
constraint survives. If the residue is empty, the critic wins.

**What the critic can legitimately claim (it partly succeeds).**

- A large fraction of the document **is** presentation: the ASCII mockups (§211, §209, §LXXII),
  the layout primitives (§186), responsive behaviour (§146, §187–188), rendering adapters
  (§185), DataGrid modes (§82), the chart/anomaly/widget-type catalogues (§18, §16–23). None
  of that constrains our platform — and the document says so itself: "the exact serialization
  format is an implementation decision" (§10), "the exact URI syntax is an implementation
  detail" (§42).
- The interaction pattern is **not claimed as novel**: the document cites Microsoft Loop,
  Figma and Notion as *evidence* for portable components, anchored comments and synced
  blocks, and says the platform "extends those ideas" (§46, §56, §61, §170–172). So the
  *pattern* is not the contribution.

**Why the critic fails to break the document's authority — four grounds.**

1. **It forces a persistent backend object into the platform.** A Widget Definition is a
   **versioned, owned, addressable registry object** with a dependency graph (§112–115) —
   that is a data-architecture object, not a screen. It has to live in the same registry and
   the same dependency graph Document 5 defined.
2. **It extends the schema-evolution machinery to a new layer.** Rule 27 and §108 require a
   business-model change to trigger **Widget** impact analysis, alongside Functions/Skills/
   Reports. That is a hard constraint on the dependency engine, not a UI concern.
3. **It imposes security-kernel constraints.** "The reference itself is not authorization"
   (§176), "sharing a Widget does not share the data" (§177), "Widgets cannot grant
   permissions" (§123), trust levels (§124). These are authorization rules that a future
   security kernel (Document 8) must honour — and they are the reason batch 5 and batch 4
   overlap.
4. **It constrains the AI architecture.** Rule 20 and §80 forbid AI from emitting UI code and
   require it to emit **Widget IR / patches**; rule 21 requires **widget-scoped context**.
   That is a direct constraint on how Hermes is integrated — which is a batch 7 concern, not
   a UI one.

**Verdict.** The critic **partly succeeds on volume and fails on substance**. The *bulk* of
Document 7 is presentation and should be read as a design intent, not a spec. But its **40
non-negotiable rules are mostly platform constraints** (business truth, permissions, commands,
dependency graph, audit, IR-not-code), and four of them reach straight into the data, security
and AI layers. So the document is **not** "a UI design wearing architecture clothes" — it is a
UI-shaped document whose invariants bind the platform. The practical lesson for the
development plan: **adopt the 40 rules; treat the visual catalogues as illustrative.**

---

## 18. Definition of done

**"What the workspace is made of":**

- **Widget Definitions** (typed, versioned, registry objects) and **Widget Instances**
  (configured placements).
- **Widgets** composed into a **tree** (visual) and a **graph** (behavioural), connected by
  **typed ports** and canonical references.
- Each Widget anchored to the **canonical Business Model**, governed **Functions/Commands**,
  the **authorization** system, and the **Object Registry**.
- The whole thing rendered from **semantic Widget IR** — never from generated source code.

**"What a front end must support to be part of this platform":** the six capabilities in
§15c — render semantic IR; resolve `@`/`#` with permission filtering and ambiguity handling;
keep business state behind Commands; separate collaborative state from business state; track
widget dependencies; treat references as not-authorization.

**Met?** Yes. §15b answers the batch's own question (they do not line up; the kit is the
renderer, the Widget Runtime/IR/registry/resolver are new builds; the word "widget" must be
disambiguated). §15c states the front-end requirement set. §16 fixes the normative register.

---

## 19. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **The reference layer** (`@`/`#` resolver over the Object Registry, permission-filtered) is a **new subsystem** we do not have — the biggest single front-end gap. | Batch 6 (kit scope), Batch 12 (plan) |
| 2 | **The naming collision**: the kit's dashboard "widget" vs the vision's Business Widget. Decide the naming before building. | Batch 9 (map) |
| 3 | **Object-aware data security** (§123–125, §173–178): reference ≠ authorization; sharing ≠ sharing data; trust levels; external-sharing default. Overlaps the security kernel. | Batch 5 |
| 4 | **AI must emit Widget IR / patches, never UI code** (rule 20, §80); widget-scoped context (rule 21, §128). Constrains the Hermes integration. | Batch 7 |
| 5 | **The kit's UMES extension system** (spot injection + component override) is the reusable asset; confirm its full scope. | Batch 6 |
| 6 | **The messages object-link** (`{entityModule, entityType, entityId}` + snapshot) is a partial foundation for canonical references — currently ships **empty**. Confirm whether to extend it. | Batch 6 |
| 7 | **Front-end framework is undecided** (README §15). Our Next.js/React front end is therefore a free choice, not a conflict. | Batch 12 |
| 8 | README has **two `# 7` (lines 361, 1635) and two `# 8` (440, 1688)** — so "README §7/§8" is ambiguous. Cite vision documents by number. (Already recorded in batch 3.) | Recorded |
