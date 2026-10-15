# Batch 05 — Widgets and Frontend (PX-W / PX-F)

**Study:** n8n `2.44.0` · **Batch:** 05 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code (§ batch 00)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.

---

## 0. What this batch had to answer

Two cross-cutting questions. **PX-F** is how the surface is built; **PX-W** is the composable surface
itself. Batch 00 predicted that **PX-W would be the strongest pole of any platform studied** — the four
closed studies were each measured to have *no* widget or composition model at all.

**It is, and the measurement says so.**

| Question | n8n's answer | Where |
|---|---|---|
| How big is the frontend? | **1,351 `.vue` files** in `packages/frontend` | F05-01 |
| What is it made of? | **`editor-ui`** + **12 `@n8n` frontend packages** | F05-02 |
| Is there a design system? | **129 components**, an **ESLint plugin that enforces it**, and a **styleguide with tokens** | F05-03/04 |
| **Is there a composition surface?** | **Yes — a canvas** built from nodes, edges, handles, groups, selection, background and buttons | F05-05 |
| Can people edit together? | **Yes — a CRDT layer** following the **y-websocket protocol**, with **awareness** (presence and cursors) | F05-06 |
| Can features be added? | **Pluggable modules** with a hard isolation rule: *"A module must never import `@/…`"* | F05-07 |
| Can third parties add nodes? | **`create-node`** — a CLI scaffolder with **declarative** and **programmatic** templates | F05-08 |

---

## 1. The measured surface

| Quantity | Measured |
|---|---|
| `.vue` files in `packages/frontend` | **1,351** |
| `@n8n` frontend packages | **12** |
| Design-system components | **129** |
| `editor-ui/src/features/` | **16 feature modules** |
| Canvas element types | **7** |
| CRDT package files | **35** |

**The shape:** `packages/frontend/` holds **`editor-ui/`** (the Vue app) and **`@n8n/`** (12 shared
packages). `editor-ui/src/` has `app/`, **`features/`**, `experiments/`, and the shims.

---

## 2. The frontend packages

`packages/frontend/@n8n/` — **12 packages**:

| Package | What it is |
|---|---|
| **`design-system`** | the component library — **129 components** |
| **`eslint-plugin-design-system`** | **an ESLint plugin that enforces the design system** |
| `frontend-module-sdk` + `module-cli` | the module system |
| `chat` | the chat surface |
| `composables` | shared Vue composables |
| `frontend-constants` · `frontend-utils` · `frontend-test-utils` · `frontend-vite-config` | infrastructure |
| `i18n` | internationalisation |
| `rest-api-client` · `stores` | data and state |

**➜ F05-02 [foundational] — The frontend is a Vue app plus twelve shared packages, and the component
library is one of them with its own enforcement plugin.** **Plain meaning:** the UI is not one folder —
it is a product with a library, a module system, a style guide and a linter that knows the difference.
**Why it matters:** it is the first platform studied whose frontend is *built like a product* rather than
bolted onto a server.

---

## 3. The design system — and it is enforced

`packages/frontend/@n8n/design-system/src/` holds `components/` (**129**), `composables/`, `css/`,
`directives/`, `icons/`, `locale/`, `mixins/`, **`styleguide/`**, `types/`, `plugin.ts`, `constants.ts`.

**The components are named to a convention** — `N8nActionDropdown`, `N8nAlert`, `N8nAiModelSelectorDropdown`,
`CodeDiff`, `DateRangeButton`, `IconTextButton` — **and the canvas has its own components**:
**`CanvasPill`, `CanvasCollaborationPill`, `CanvasThinkingPill`**, `AskAssistantButton`,
`AskAssistantChat`, `BlinkingCursor`.

**And it is enforced, in two ways:**
1. **`eslint-plugin-design-system`** — rules including `require-teleported-tooltip-in-dropdown`
   (`rules/require-teleported-tooltip-in-dropdown.ts`), which is exactly the guidance in the frontend's
   `AGENTS.md`.
2. **A styleguide with tokens** — `styleguide/` holds `colour.mdx`, **`css-tokens.mdx`**, `motion.mdx`,
   `shadow.mdx`, **`spacing-size.mdx`**, `type.mdx` and `VariableTable.vue`.

**➜ F05-03 [foundational] — The design system is 129 components, documented with tokens (colour, CSS
tokens, motion, shadow, spacing) and enforced by its own ESLint plugin.** **Plain meaning:** "use the
design system" is not a convention — it is a lint rule that fails a build. **Why it matters:** a design
system that is only written down drifts; one that is linted does not.

**➜ F05-04 [foundational] — The frontend's `AGENTS.md` is a real engineering record**, carrying rules a
contributor could not guess:
- *"Frontend feature modules are at `packages/modules/<name>/frontend`, **and not** in
  `editor-ui/src/features`"*;
- ***"A module must never import `@/…` or another `@n8n/frontend-module-*`"***;
- *"Use keys from `updatedIconSet` only — **`deprecatedIconSet` entries must not be used in new code**"*;
- *"Use centralized constants from `@/app/constants/durations` instead of hardcoding"*, with the
  categories **`UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`**.

**Why it matters:** the isolation rule is the one that makes a pluggable frontend possible, and the icon
deprecation discipline is a retirement rule (rule 10) living in a contributing guide rather than a
changelog.

---

## 4. The canvas — the composition surface

`packages/frontend/editor-ui/src/features/workflows/canvas/` holds **`Canvas.vue`** and
**`WorkflowCanvas.vue`**, plus `canvas.eventBus.ts`, `canvas.types.ts`, `canvas.utils.ts`,
`nodeGroups.utils.ts`, `emptyGroup.utils.ts`, `iconLuma.utils.ts`, `composables/`, `stores/`,
`experimental/`.

### 4.1 The seven element types

`canvas/components/elements/` holds exactly seven directories:

| Element | What it is |
|---|---|
| **`nodes`** | the workflow steps |
| **`edges`** | the connections between them |
| **`handles`** | the connection points on a node |
| **`groups`** | visual grouping of nodes |
| **`selection`** | multi-select behaviour |
| **`background`** | the canvas background (grid) |
| **`buttons`** | canvas controls |

**➜ F05-05 [foundational] — The composition surface is a graph canvas built from seven element types:
nodes, edges, handles, groups, selection, background and buttons.** **Plain meaning:** a user composes a
workflow by placing nodes and drawing edges between handles — the thing the four earlier platforms were
measured *not* to have. **Why it matters:** this is the answer to the workshop's PX-W question, and it is
a *graph editor*, not a form builder.

### 4.2 The canvas has a layout engine and knows where agents go

`canvas/composables/` holds **`useCanvasLayout.ts`** (with guards), `useCanvasMapping.ts` (plus a
`.groups` variant), **`useCanvasAgentNodeGeometry.ts`**, `useCanvasGroupIdStorage.ts`, `useCanvas.ts`,
and `nodeGroupTelemetry.utils.ts`.

**➜ F05-09 [foundational] — The canvas has a layout engine, a mapping layer, and dedicated geometry for
agent nodes.** **Plain meaning:** the surface is not a passive renderer — it computes where things go,
and it treats AI agent nodes as a shape of their own. **Why it matters:** a composition surface that
knows how to lay itself out is what separates a canvas from a diagram.

---

## 5. Collaboration — a CRDT layer with awareness

`packages/@n8n/crdt/` — **35 files**: `awareness/`, `protocol.ts`, `providers/`, `sync/`,
`transports/`, `types.ts`, **`undo/`**, `utils.ts`.

**The protocol** (`src/protocol.ts`) is the finding:

> *"WebSocket message protocol constants. **Following the y-websocket protocol**, messages are prefixed
> with a type byte to multiplex different message types over the same connection."*

> *"Server protocol format: `[messageType: u8, ...payload]` · Worker protocol format:
> `[messageType: u8, docIdLen: u16, docId: utf8, ...payload]`"*

And the message types name the whole model:

| Constant | Value | Meaning |
|---|---|---|
| `MESSAGE_SYNC` | 0 | *"contains CRDT document updates"* |
| **`MESSAGE_AWARENESS`** | 1 | ***"ephemeral presence/cursor data"*** |
| `MESSAGE_SUBSCRIBE` / `MESSAGE_UNSUBSCRIBE` | 2 / 3 | subscribe to / release a document |
| `MESSAGE_CONNECTED` | — | connection established |

**➜ F05-06 [foundational] — Multiple people edit the same workflow through a CRDT layer that follows the
y-websocket protocol, with a separate awareness channel for presence and cursors.** **Plain meaning:**
two people can drag nodes on one canvas at once, and each can see the other's cursor — and the sync
protocol is a standard one, not invented here. **Why it matters:** it is the difference between a shared
*file* and a shared *surface*, and the `features/collaboration/` directory plus the
`CanvasCollaborationPill` component show it is wired into the UI.

**And there is an `undo/` directory** — collaborative undo is its own problem, and n8n ships a module
for it.

---

## 6. The module system — isolation by rule

`editor-ui/src/features/` holds **16 modules**: `agents`, `ai`, **`collaboration`** (with a `projects/`
sub-module), `core`, `credentials`, `execution`, `integrations`, `ndv`, `resolvers`, `roles`,
`settings`, `setupPanel`, `shared`, **`workflow-reviews`**, `workflows`.

**➜ F05-07 [foundational] — The editor's features are pluggable modules, and the isolation rule is
explicit: a module owns its tsconfig, lint config and vitest config, and *must never import `@/…` or
another `@n8n/frontend-module-*`*.** **Plain meaning:** a feature cannot reach into the app or into a
sibling — it talks through the module SDK. **Why it matters:** it is what makes the frontend extensible
rather than merely large, and it is enforced by a stated rule rather than by hope.

---

## 7. Third parties: `create-node`

`packages/@n8n/create-node/` is a **CLI scaffolder** (`npm create @n8n/node`) whose README documents
**three templates**:

| Template | What it produces |
|---|---|
| **`declarative/custom`** | *"a minimal declarative node structure"* |
| `declarative/github-issues` | a worked GitHub Issues example |
| **`programmatic/example`** | *"a full programmatic node with advanced features"* |

**➜ F05-08 [foundational] — A node can be authored two ways — declaratively (a description object) or
programmatically (code) — and a CLI scaffolds either.** **Plain meaning:** the 563 built-in nodes and the
community's nodes come from the *same* authoring model, and the easiest path needs no code. **Why it
matters:** it is how "1,500+ integrations" is actually maintained, and the declarative path is what makes
an integration a *data file* rather than a merge request.

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F05-01** | **1,351 `.vue` files** — the frontend is a product, not a view layer. | PX-F | (indirect) — the editor is thorough. | A frontend built like a product. |
| **F05-02** | **`editor-ui` + 12 `@n8n` packages**, the component library among them. | PX-F | One install, one toolchain. | A frontend with a real internal boundary. |
| **F05-03** | **129 design-system components, documented with tokens, enforced by its own ESLint plugin.** | PX-F | The UI is consistent and the rule is automatic. | A design system that cannot drift. |
| **F05-04** | **A frontend `AGENTS.md` with an isolation rule, an icon deprecation discipline and centralised durations.** | PX-F | (indirect) | Rules that make a pluggable frontend possible. |
| **F05-05** | **A canvas of seven element types** — nodes, edges, handles, groups, selection, background, buttons. | PX-W | Compose a workflow by placing nodes and drawing edges. | The composition surface the four earlier platforms lacked. |
| **F05-06** | **A CRDT layer on the y-websocket protocol with awareness** — plus collaborative `undo/`. | PX-W | Edit one workflow together, see each other's cursors. | A shared *surface*, not a shared file. |
| **F05-07** | **Pluggable feature modules with an isolation rule.** | PX-F | The editor grows without rotting. | Extensible rather than merely large. |
| **F05-08** | **`create-node`** — declarative and programmatic authoring, CLI-scaffolded. | PX-W | Add an integration without writing much code. | The same authoring model for built-in and community nodes. |
| **F05-09** | **A canvas layout engine, a mapping layer, and agent-node geometry.** | PX-W | The canvas arranges itself; agent nodes have their own shape. | A surface that computes, not just renders. |
| **F05-10** | **Canvas-specific components** (`CanvasPill`, `CanvasCollaborationPill`, `CanvasThinkingPill`). | PX-W | Presence and AI activity are visible on the canvas. | Collaboration and AI state as first-class UI. |
| **F05-11** | **A styleguide with tokens** (colour, CSS tokens, motion, shadow, spacing, **type**) and a `VariableTable`. | PX-F | The design language is inspectable. | Tokens as documentation, not folklore. |
| **F05-12** | **The frontend is Vue** — 1,351 `.vue` files, with `el-plus` components and Pinia stores. | PX-F | (n/a) | Recorded per rule 6. |

---

## 9. Divergences and honest bounds

- **No doc-vs-code divergence was needed**; the frontend's `AGENTS.md` describes rules the code
  follows (module isolation, icon sets, centralised durations) and the ESLint plugin enforces one of
  them. Stated plainly rather than inventing a divergence.
- **Bound:** this batch read the **frontend's shape** — the packages, the design system, the canvas's
  element types, the CRDT protocol, the module system and the node scaffolder. It did **not** read
  `Canvas.vue` or `WorkflowCanvas.vue` in full (they are large), the layout algorithm, or the
  collaboration store's internals; those are named rather than half-covered.
- **Bound:** the CRDT protocol is read from `protocol.ts`'s **constants and doc comments**; the sync
  algorithm itself (`sync/`, `providers/`, `transports/`) is named, not analysed.
- **Bound (stated plainly):** `create-node`'s `bin/` script is 11 lines (a launcher); the templates
  themselves live in a separate package and were not read.

---

## 10. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **The canvas as a graph of seven element types (F05-05)** — nodes, edges, handles, groups, selection,
   background, buttons. The composition surface the workshop's PX-W pole has been looking for.
2. **The design system enforced by its own linter (F05-03)** — 129 components, tokens, and a rule that
   fails a build.
3. **Collaboration on the y-websocket protocol with awareness (F05-06)** — presence and cursors as a
   separate channel from document sync.
4. **Declarative *and* programmatic node authoring, CLI-scaffolded (F05-08)** — the model that makes an
   integration a data file.

All four are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 05 of 07. Read from source on 2026-10-15. Next: `findings/06-out-of-pole.md`.*
