# 05 — WIDGETS AND FRONTEND (PX-W / PX-F)

**The poles:** how the interface is composed, by whom, at runtime — and how the workspace is
rendered.

**This is the largest concentration of opportunity in the study.** A widget model exists in
**exactly two of nine platforms**. Mercato already owns the *semantic* objects. The runtime
is the build.

---

## 1. What the nine platforms do

### zulip — the first real widget model (★)
> **A widget is an append-only `SubMessage` log; its state is derived by replay.**

The machinery, all of it transferable:
- **zod discriminated union** over widget kinds — one contract, every kind.
- **`GenericWidget` registry** — kinds register themselves.
- **The generic `zform` bot bridge** — any backend can drive a widget through one bridge,
  with no bespoke code per widget.

The transitional `GenericWidget` wrapper is in the honest ledger as a scar.

### n8n — the first real composition surface (★)
> A **canvas of 7 element types**, a **129-component design system**, and **its own ESLint
  plugin** that guards how the components may be composed. **CRDT on `y-websocket`** for
  collaborative editing.

This is the only platform in the study with a *design system whose composition is
machine-checked*.

### Multica — 3-package layering whose constraints are prohibitions
PX-F as three packages, and the constraints between them are **prohibitions** (what may not
import what) rather than permissions.

### Hermes, Paperclip, CrewAI, Gas Town, buzz, openrig — no widget model
Six of nine. buzz's Channel Canvas (`kind:40100`) is a *document*, not a widget tree —
recorded as such so it is never counted as a model. openrig's Context Packs compose
**prompts**. Gas Town, CrewAI, Paperclip: none.

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
the pole where two of nine platforms give us both halves of the answer.

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
| **SR-31** | Widget-kind registry; kinds register themselves | zulip (`GenericWidget`) | **BORROW** |
| **SR-32** | Composition canvas with CRDT collaboration | n8n (`y-websocket`) | **BORROW** |
| **SR-33** | Design system + own ESLint plugin guarding composition | n8n (129 components) | **BORROW** |
| **SR-34** | Prohibition-constrained 3-package frontend layering | Multica | **BORROW** |
| **SR-35** | UMES injection as the widget entry point | mercato | **HAVE** (in kit) |
| **SR-36** | Dashboard + perspective screens | mercato `M5` | **BUILD** — `M5`, zero UI today |

**Prerequisites:** SR-27 must land before SR-29 — the renderer renders a log, not a blob.
SR-33 can land independently and early (it is pure tooling).
**Triggers:** none — this is a build stream, gated only by SR-27's design.

---

*Next: `06-out-of-pole.md`.*
