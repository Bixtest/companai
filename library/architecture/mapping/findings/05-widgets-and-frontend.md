# 05 — WIDGETS AND FRONTEND (PX-W / PX-F)

**The poles:** how the interface is composed, by whom, at runtime — and how the workspace is
rendered.

**This is the largest concentration of opportunity in the study.** Widget *architecture* exists
in three of nine platforms — a **model** in two (n8n's composition surface, zulip's append-only
log) and a **protocol** in a third (CrewAI's A2UI). Mercato already owns the *semantic*
objects. The runtime is the build.

---

## 1. What the nine platforms do

### zulip — the first real widget model (★)
> **A widget is an append-only `SubMessage` log; its state is derived by replay.**

The machinery, all of it transferable:
- **zod discriminated union** over widget kinds — one contract, every kind.
- **The `GenericWidget` registry** — populated by **injection, not import**, and the code says
  why: *"They are currently injected into us from another module for historical reasons. (as of
  January 2026)"* (`:14-16`). **Correction [C]:** the first version said "kinds register
  themselves"; the markdown says the opposite, and D5-2 records it as *"acknowledged debt."*
- **The generic `zform` bot bridge** — any bot can send a `choices` payload; *"the study's
  first genuine bot↔widget bridge, and it flows both ways."*

The transitional `GenericWidget` wrapper is in the honest ledger as a scar (D5-2), alongside
the `tictactoe` scar (D5-3). And zulip **deliberately declines** to make it a plugin system
(§5.5): *"Right now we don't have a plugin model"*, no dynamic loading, no composer, no schema
versioning — *"Zulip has a widget model and explicitly declines to make it a plugin system."*
That is a design position worth copying, not a gap.

### n8n — the first real composition surface (★)
> A **canvas of 7 element types** (`nodes, edges, handles, groups, selection, background,
> buttons` — F05-05), a **129-component design system**, and **its own ESLint plugin**
> (`eslint-plugin-design-system`) that guards how the components may be composed. **CRDT on
> `y-websocket`** for collaborative editing.

**Correction [C]:** the first version claimed n8n is *"the only platform in the study with a
design system whose composition is machine-checked."* That is false — **Paperclip has a
mechanical token gate** (`check:token-gates`, *"compliance is enforced, not reviewed"*, C5-2),
and buzz adds executable CI guards (F5-3). The claim to keep is narrower: n8n is the platform
whose *frontend composition* is machine-checked by its own lint plugin.

### Multica — 3-package layering whose constraints are prohibitions
PX-F as three packages, and the constraints between them are **prohibitions** (what may not
import what) rather than permissions: *"A strict three-package layering with named
*prohibitions* (`views → core + ui`; core and ui independent; no `localStorage`, no `next/*`,
no stores in views)"* (F05-01). Plus platform adapters (F05-02), component contracts + a UI Lab
(F05-04/05), state/API boundaries (F05-07), and a deployed-client zod rule (F05-08).
**Multica has no widget model either** — F05-06, *"measured absent (0 composers; 13 incidental
mentions)."*

### CrewAI — a real widget *protocol*, not a model
**Correction [C] — the biggest structural error in the first version of this file.** CrewAI was
listed as having no widget model. Its own batch is headed *"**A2UI — the actual widget
architecture (the important find)**"* and states *"It is 3,669 lines and it is the **most
complete widget architecture in the tree**"* (`05-widgets-and-frontend §5.3`).

What it actually is: a **declarative UI vocabulary a client renders** — an `A2UIMessage`
envelope with an `A2UIEvent`/`UserAction` return direction, where a user action carries
`surface_id` so *"an action knows *which surface* it came from."* The piece worth stealing is
the **18-component typed catalog** whose `allowed_components` is *"enforced on the *response*
… not just advertised in the *prompt*"* (F5-7) — called *"the single most reusable widget-pole
idea in the batch, and it belongs on the mapping table."*

The markdown's own discipline, which this mapping adopts: **"Say 'widget *protocol*', never
'widget system'."** No renderer ships in CrewAI's tree (§5.7 gap table: *"A renderer | **none**"*).
Filed as **SR-32a**.

### Hermes, Paperclip, Gas Town, buzz, openrig — the negatives, counted correctly
**Seven of nine have no widget model.** buzz's Channel Canvas (`kind:40100`) is a *document*
with optimistic concurrency, not a composition model — *"not a widget tree"* (§7) — recorded as
such so it is never counted. openrig's Context Packs compose **prompts**: *"OpenRig has a
composition system — of PROMPTS … **Nothing composes into a UI**"* (§8.4, F5-2). Gas Town: *"No
widget model — the negative, measured … it does not"* (F05-06).

**Correction [C] on the count:** the first version said "six of nine" and then named only six
platforms — it omitted Multica, making the arithmetic wrong twice. The correct count is
**seven** (Paperclip, Multica, Gas Town, buzz, openrig, Hermes, and CrewAI has a protocol
rather than a model).

**Correction [C] on Hermes:** "no widget model" is **unverified**, not measured. No file in the
Hermes corpus states either way — `12-SYNTHESIS` and `13-prior-coverage-audit` never mention
widgets. The count is therefore "seven of eight measured", with Hermes unmeasured.

---

## 2. What mercato has

| HAVE IT | Where | Notes |
|---|---|---|
| `BusinessWidget` / `WidgetIR` / `WidgetInstance` | semantic objects | The *semantic* layer already exists |
| UMES injection widgets | in the kit | |
| Next.js / React | frontend | |
| AppShell | 11 spot mounts | |
| ai-assistant | 34 files | |
| **Widget runtime** | — | **the BUILD** |
| **Semantic renderer** | — | **the BUILD** |
| **Workspace screen** | — | **absent** (`M5`, zero UI) |
| Dashboard / perspective screens | — | **absent** (`M5`) |

## 3. The gap

Mercato owns the *description* of a widget and no *engine* for one. `WidgetIR` exists;
nothing replays it. That is the single largest unfinished surface in the product, and it is
the pole where three platforms give us parts of the answer — zulip the model, n8n the
composition surface, CrewAI the protocol — and we already own the semantics.

## 4. The target — RE-ENGINEER IT

**The widget as an append-only log with derived state, on a composition canvas, rendered by
one generic renderer.**

1. **The widget is a log, not a blob.** A `WidgetInstance` is an append-only event log; the
   rendered state is derived by replay. This makes widgets undoable, auditable, and
   crash-safe for free.
2. **A discriminated-union contract** over widget kinds — the same zod-style union zulip
   uses, so adding a kind is a type change, not a rewrite.
3. **One generic renderer.** `WidgetIR` → DOM through a single renderer keyed by kind. No
   bespoke runtime per widget.
4. **A generic bridge.** One bridge through which any backend — agent, automation, human —
   drives any widget. This is what makes widgets *composable by others*.
5. **A composition canvas.** Element types on a canvas, with CRDT collaboration.
6. **A widget *protocol*, kept distinct from a widget *model*.** CrewAI's A2UI shows the
   protocol half: a declarative vocabulary, a typed component catalog, and
   `allowed_components` enforced **on the response**. The renderer stays ours (SR-29).
6. **A design system with lint rules.** Components whose composition is machine-checked.
7. **Prohibition-constrained layering.** Three packages; the constraints say what may not
   import what.
8. **UMES injection as the entry point.** Already in the kit — the widget's way into a
   running assistant turn.

## 5. Requirements

| ID | Requirement | Source | HAVE / BUILD / BORROW / RE-ENGINEER |
|---|---|---|---|
| **SR-27** | Widget = append-only log; state derived by replay | zulip (`SubMessage`) | **RE-ENGINEER** — extends `WidgetInstance` with a log |
| **SR-28** | Discriminated-union contract over widget kinds | zulip (zod union) | **BUILD** |
| **SR-29** | One generic renderer: `WidgetIR` → DOM, keyed by kind | zulip + mercato | **BUILD** — the identified BUILD |
| **SR-30** | Generic bridge: any backend drives any widget through one path | zulip (`zform`) | **BORROW** |
| **SR-31** | Widget-kind registry, populated by injection (zulip's own way, acknowledged debt) | zulip (`GenericWidget`, §5.3, D5-2) | **BORROW** |
| **SR-32** | Composition canvas with CRDT collaboration | n8n (`y-websocket`) | **BORROW** |
| **SR-32a** | **Widget protocol:** declarative vocabulary + 18-component typed catalog, `allowed_components` enforced on the response | CrewAI (`05-widgets-and-frontend §5.3`, 3,669 lines) | **BORROW** — a protocol, never a "widget system" |
| **SR-33** | Design system + own ESLint plugin guarding frontend composition | n8n (129 components; Paperclip's `check:token-gates` is the other mechanical gate) | **BORROW** |
| **SR-34** | Prohibition-constrained 3-package frontend layering | Multica (F05-01) | **BORROW** |
| **SR-35** | UMES injection as the widget entry point | mercato | **HAVE** (in kit) |
| **SR-36** | Dashboard + perspective screens | mercato `M5` | **BUILD** — `M5`, zero UI today |
| **SR-33a** | Deliberate non-features recorded: no plugin model, no dynamic loading, no schema versioning | zulip (§5.5) | **BORROW** — a design position, not a gap |
| **SR-35a** | Frontend as information architecture: a fetcher interface of ~14 methods beats a widget tree | Gas Town (`ConvoyFetcher`, F05-04) | **BORROW** |

**Corrections [C] applied 2026-10-16 against the markdown:** the widget-model count is
**seven of eight measured** (Hermes unmeasured), not "six of nine"; **CrewAI has a real widget
protocol** and was wrongly listed as having none; the "only platform with machine-checked
composition" claim is false (Paperclip's token gate); zulip's registry is populated by
**injection**, not self-registration; Multica's migration 344 lives in its **06** file, not
its 05; and zulip's deliberate non-features are a position worth copying, not omissions.

**Added from the same pass:** Paperclip's PX-W model — the mechanical token gate (C5-2), a
**510-image visual baseline** (C5-3), a decision sheet (C5-4), and 24 primitives under 206
feature components (C5-5), which its own batch calls *"the clearest single contribution to
PX-W"*; buzz's guard-as-document pattern and two-dials-one-rem typography (F5-6); openrig's
digital-twin harness (F5-3); n8n's module isolation rule (F05-07) and canvas layout engine
(F05-09); and Gas Town's HTMX + SSE no-build dashboard (F05-09).

**Prerequisites:** SR-27 must land before SR-29 — the renderer renders a log, not a blob.
SR-33 can land independently and early (it is pure tooling).
**Triggers:** none — this is a build stream, gated only by SR-27's design.

---

*Next: `06-out-of-pole.md`.*
