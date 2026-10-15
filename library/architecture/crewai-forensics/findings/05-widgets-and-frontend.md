# CrewAI forensics — Batch 05: widgets and frontend (PX-W / PX-F)

**Batch retargeted, as promised in Batch 04.** CrewAI has **no in-tree web UI**. That is now a
measured fact, not an assumption (§5.1). The useful question is therefore not "what is their web
app like" but: **what interface surfaces exist in this tree, and which of them is a widget
architecture?**

**Method rules in force.** Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority
(rule 1). Every claim carries `file:line`. No platform comparison inside a batch (rule 5). Pole-tag
every finding (rule 9); name every capability (rule 6); report the negative findings too (rule 6 —
a capability that is *absent* is a finding).

Paths relative to `library/architecture/platforms/_extracted/crewAI-main/`. Version `1.15.28`.

---

## 5.1 First, the negative: there is no frontend here

Measured by direct search, not inferred:

```
find . -name "package.json" -not -path "*/node_modules/*"     → nothing
find . -type f \( -name "*.html" -o -name "*.vue" -o -name "*.svelte" \) \
     -not -path "./docs/*" -not -path "*/node_modules/*"      → nothing
```

The top level is `docs/ · lib/ · scripts/` plus Python config (`pyproject.toml`, `uv.lock`,
`conftest.py`) and `.github/`. The workspace is **six Python members**; there is no `web/`, no
`ui/`, no `frontend/`, no build toolchain, no JS runtime anywhere in the source.

**➜ F5-1 [PX-F] — CrewAI ships no frontend of any kind.** Everything a user sees is produced by
Python: terminal output, a terminal app, an HTML file written to disk, or JSON handed to *someone
else's* renderer. **Plain meaning:** if we are studying this platform for frontend construction
patterns, there is nothing to study — and that is itself the finding. **Why it matters:** the
widget/frontend pole cannot be sourced from CrewAI's UI layer. It can ONLY be sourced from the two
places where CrewAI had to *define a component vocabulary* and hand it to something else
(§5.3 A2UI, §5.4 the flow diagram). Those two are genuinely valuable; the absence is not.

---

## 5.2 The interface surfaces that DO exist

Four, and they are very different from each other:

| Surface | What it is | Where | Size |
|---|---|---|---|
| **Terminal app** | a full-screen Textual TUI for watching a crew run | `lib/cli/src/crewai_cli/crew_run_tui.py` | **3,278 lines** |
| **Terminal app (×3 more)** | checkpoint TUI, memory TUI, picker | `checkpoint_tui.py`, `memory_tui.py`, `tui_picker.py` | 871 + 393 + 565 |
| **Static diagram** | a flow drawn to a standalone HTML file | `flow/visualization/` | 878 lines |
| **Widget protocol** | a declarative UI vocabulary sent *to a client that renders it* | `a2a/extensions/a2ui/` | **3,669 lines** |

Plus, on the output side rather than the input side: `rich` consoles and tables used throughout the
CLI (e.g. `triggers/main.py:5-11`, `:100-113`), and the docs **site**, which is not built here at
all — `docs/docs.json` is a 3.16 MB **Mintlify** config (`"$schema":
"https://mintlify.com/docs.json"`, `"theme": "aspen"`), i.e. a hosted documentation SaaS consuming
markdown.

**➜ F5-2 [PX-F] — The four surfaces are four different technologies with no shared vocabulary.**
A Textual app (`crew_run_tui.py`), a Jinja2+HTML renderer (`visualization/`), a JSON widget
protocol (`a2ui/`), and an external SaaS. **Plain meaning:** CrewAI did not build "a UI layer"; it
built four independent things that each happen to show something. **Why it matters:** for our own
platform this is a warning, not a model. There is no "CrewAI widget system" to adopt — there are
four unrelated interfaces, and only the JSON one (`a2ui`) is architecture rather than a screen.

---

## 5.3 A2UI — the actual widget architecture (the important find)

`lib/crewai/src/crewai/a2a/extensions/a2ui/` is titled, in its own docstring,
**"A2UI (Agent to UI) declarative UI protocol support for CrewAI"**
(`a2ui/__init__.py:1`). It is 3,669 lines and it is the most complete widget architecture in the
tree. It is *not* a UI — it is a **protocol by which an agent describes a UI for someone else to
render**.

### 5.3.1 The message vocabulary: a render-tree protocol with a data model

`a2ui/models.py` defines the wire format. There are exactly four server→client message kinds, and
each is a named class:

- `BeginRendering` (`:106`) — `surface_id` (`:109`, aliased `surfaceId`), a catalog id (`:114`),
  and optional surface styling (`:117`). Docstring: *"Signals the client to begin rendering a
  surface."*
- `SurfaceUpdate` (`:123`) — *"Updates a surface with a new set of components"* (`:124`);
  `surface_id` (`:126`) plus `components`, `min_length=1` (`:128`).
- `DataModelUpdate` (`:134`) — *"Updates the data model for a surface"* (`:135`); keyed by
  `surface_id` (`:137`).
- `DeleteSurface` (`:148`) — *"Signals the client to delete a surface"* (`:149`).

They are unified in one envelope, `A2UIMessage` (`:158`), whose four optional fields are exactly
those four (`:166-180`), with a validator at `:190-192` enforcing **exactly one message kind per
envelope** (matching the prompt's *"emit exactly ONE per message"* — `prompt.py:53`).

The client→server direction is `A2UIEvent` (`:220`) / `UserAction` (`:200`), where a user action
carries `surface_id` (`:204`) — i.e. an action knows *which surface* it came from. `A2UIResponse`
(`:242`) is the aggregate reply.

**➜ F5-3 [PX-W] — The widget architecture is a four-message protocol: create surface, set
components, set data, delete surface — plus an action coming back.** **Plain meaning:** the agent
does not draw pixels; it sends *"here is a panel, here are the pieces in it, here is the data they
show"*, and the receiving app does the drawing. **Why it matters:** this is a clean separation we
can adopt wholesale — **render-tree + data-model + events**, with the data model addressed by path
(`BoundValue.path` at `:23`, sibling to `literal_string`/`literal_number`/`literal_boolean`/
`literal_array` at `:15-22`). It means the same agent UI can be rendered by any client that speaks
the catalog.

### 5.3.2 The catalog: 18 named components, and they are ordinary UI primitives

`a2ui/catalog.py` is the widget vocabulary. The exported set (`a2ui/__init__.py:3-22`) is:
**Text, Image, Video, AudioPlayer, Icon, Row, Column, List, Card, Tabs, Divider, Modal, Button,
CheckBox, TextField, DateTimeInput, MultipleChoice, Slider** — 18 components. Their class
definitions are in `catalog.py`: `Text` (`:141`), `Image` (`:152`), `Icon` (`:234`),
`Video` (`:242`), `AudioPlayer` (`:250`), `Row` (`:261`), `Column` (`:278`), `List` (`:295`),
`Card` (`:309`), `Tabs` (`:317`), `Divider` (`:327`), `Modal` (`:337`), `Button` (`:350`),
`CheckBox` (`:362`), `TextField` (`:373`), `DateTimeInput` (`:392`), `MultipleChoice` (`:410`),
`Slider` (`:430`).

Supporting types make it a real vocabulary rather than a list: bindings (`StringBinding:14`,
`NumberBinding:25`, `BooleanBinding:36`, `ArrayBinding:47`), composition (`ChildrenDef:58`,
`ChildTemplate:73` — a template for repeated children), and interaction (`Action:112`,
`ActionContextEntry:86`, `ActionBoundValue:95`, `TabItem:123`, `MultipleChoiceOption:132`).

**➜ F5-4 [PX-W] — A closed, typed component catalogue of 18 primitives, with bindings,
composition, and actions.** **Plain meaning:** there is a fixed menu of widgets, and a definition
says which one, where it sits, what it shows, and what it does when clicked. **Why it matters:**
"closed and typed" is the decision that makes it safe — the client can only ever be asked to render
something in the catalogue. Compare: an open HTML string would be an injection surface. This is the
argument for *our* widget system being a catalogue too.

### 5.3.3 The two-version split, and why it is instructive

There are **two catalogs in one module**, side by side:

- **v0.8** — `A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v0.8"`
  (`server_extension.py:23`), MIME type `"application/json+a2ui"` (`:22`), and **nested** components
  — a component wrapper containing exactly one component-type key (`prompt.py:56-57`).
- **v0.9** — `A2UI_V09_EXTENSION_URI` (`:27`), `A2UI_V09_BASIC_CATALOG_ID` (`:28`), and a
  **flat** component form, explicitly documented in the prompt with the reason:

  ```
  COMPONENT FORMAT (flat, NOT nested):
  {"id": "myText", "component": "Text", "text": "Hello world", "variant": "h1"}
  {"id": "myBtn", "component": "Button", "child": "myText", "action": {"event": {"name": "click"}}}
  ```
  (`prompt.py:129-132`), plus `createSurface` / `updateComponents` / `updateDataModel` /
  `deleteSurface` replacing `beginRendering` / `surfaceUpdate` / `dataModelUpdate` /
  `deleteSurface` (`:118-127`).

v0.9 adds what v0.8 lacked: `id: "root"` as a required anchor (`:124`), a `theme` block
(`primaryColor`, `iconUrl`, `agentDisplayName` — `:119-121`), JSON-Pointer data paths (`:125-126`),
and **client-side functions** — `{"call": "functionName", "args": {...}}` (`:137`), with a distinct
action shape for server events vs local function calls (`:140-141`).

**➜ F5-5 [PX-W] — The protocol has two generations living side by side, and the differences are
exactly the hard design decisions.** **Plain meaning:** v0.8 nested each component inside a wrapper;
v0.9 flattened it, anchored the tree at a required `root`, added themes, JSON-Pointer data paths,
and a distinction between "call the server" and "call a local function". **Why it matters:** those
four deltas are the design review we would otherwise have to do ourselves — especially the
flat-vs-nested choice (flat is easier for an LLM to emit reliably) and the
server-event-vs-local-function split, which is a *security* boundary: one crosses the network, the
other runs in the user's app.

### 5.3.4 How the widget is produced: prompt augmentation, not tool calls

This is the architecturally decisive part.

`a2ui/client_extension.py:212-213`:

```python
def inject_tools(self, agent: Agent) -> None:
    """No-op — A2UI uses prompt augmentation rather than tool injection."""
```

And the counterfactual is named in the class docstring at `:182`: *"Implements the `A2AExtension`
protocol to inject A2UI prompt…"*. So instead of giving the model a `render_ui(...)` tool, the
extension **appends a system-prompt fragment** that teaches the model the protocol:

`a2ui/prompt.py:19` `build_a2ui_system_prompt(catalog_id=None, allowed_components=None)` returns a
fragment of the form (`:48-81`):

```
<A2UI_INSTRUCTIONS>
You can generate rich, declarative UI by emitting A2UI JSON messages.

CATALOG: {catalog_label}
AVAILABLE COMPONENTS: {", ".join(components)}
...
SCHEMA:
{schema_json}
</A2UI_INSTRUCTIONS>
```

The schema is not hand-written — it is loaded and serialised into the prompt
(`:42-43` `load_schema("server_to_client_with_standard_catalog", version="v0.8")` then
`json.dumps(..., indent=2)` at `:45-46`), and the v0.9 variant does the same with
`load_schema("server_to_client", version="v0.9")` (`:106`). The component list is
`sorted(allowed_components if allowed_components is not None else STANDARD_CATALOG_COMPONENTS)`
(`:99-101`).

Then the **response** is parsed back out of the model's text — `_extract_and_validate` (`:455`),
`_try_validate` (`:464`), and the v0.9 twins (`:477`, `:486`), with
`process_response` (`:304`), `prepare_message_metadata` (`:343`), `augment_prompt` (`:286`), and
`is_ready` (`:174`).

**➜ F5-6 [PX-W] — The widget channel is the prompt and the response text — there is no tool call
and no schema-validated function.** **Plain meaning:** the agent is *told*, in its instructions, how
to write UI, and the platform then fishes JSON objects out of its reply and validates them.
**Why it matters:** this is the opposite of the tool-calling approach and it has a clear
consequence — **the model can produce invalid UI**, so every response must be extracted and
validated (`_extract_and_validate`). It also means the widget vocabulary is bounded by what the
prompt can describe, which is why `allowed_components` exists. If our platform renders widgets, we
must decide this same question (prompt-augmented vs tool-caled) and own the validation either way.

### 5.3.5 `allowed_components` — the widget permission seam

`allowed_components` is threaded through the whole path: `build_a2ui_system_prompt(...,
allowed_components=None)` (`prompt.py:21`), `build_a2ui_v09_system_prompt(...,
allowed_components=None)` (`:86`), and — critically — it is enforced on the *response* as well as
advertised in the *prompt*:

`a2ui/client_extension.py:397` `_filter_components(msg: A2UIMessageDict, allowed: set[str])` and
`:426` `_filter_components_v09(...)`.

**➜ F5-7 [PX-W → cross-cutting] — The widget set is subsettable, and the subset is enforced on the
way out, not just advertised on the way in.** **Plain meaning:** you can tell an agent "you may use
these six widgets, not the whole catalogue", and the platform will strip anything outside that set
from its output. **Why it matters:** this is the *first* place in the whole CrewAI study where a
per-tenant or per-role restriction is enforced rather than merely configured — compare Batch 02's
finding that the MCP `ToolFilterContext(agent, server_name, run_context)` seam ships
**unpopulated** (`mcp/filters.py:17-35`). Here the same idea is real: a bounded vocabulary, named,
checked on both sides. **This is the single most reusable widget-pole idea in the batch**, and it
belongs on the mapping table.

### 5.3.6 The extension hook contract

A2UI plugs in through the generic extension system (`a2a/extensions/base.py`):
`A2AExtension` is a `Protocol` (`:57`), `ExtensionRegistry` at `:167`, and the server side has two
async hooks — `on_request(self, context: ExtensionContext)` and `on_response(self, context,
result)` (`a2ui/server_extension.py:80`, `:97`) — with `params()` (`:72`) declaring what the
extension advertises. The server extension is a pydantic model (`:31`) whose `uri` defaults to the
v0.8 URI (`:48`) and is switched to v0.9 in `__init__` (`:69`).

**➜ F5-8 [PX-W] — The widget protocol is an *extension* of the A2A protocol, not a platform
feature.** **Plain meaning:** A2UI rides on the agent-to-agent protocol as an add-on that can
rewrite requests and responses. **Why it matters:** it means the widget channel is a *transport
concern* in their design, not a UI-layer concern. For us that is a useful contrast — our widgets
will likely be a first-class platform surface, and we should be explicit that we are making the
opposite choice deliberately.

---

## 5.4 The second artefact: the flow diagram

Already noted in Batch 04 §4.4.4; recorded here under its own pole.

`flow/runtime/__init__.py:4002` `plot(filename="crewai_flow.html", show=True)` — emits a
`FlowPlotEvent` (`:4011-4017`), builds `build_flow_structure(self)` (in `visualization/builder.py`,
343 lines), and renders via `render_interactive(structure, ...)`
(`visualization/renderers/interactive.py`, 466 lines): a Jinja2 environment
(`:397-400`, `FileSystemLoader`, `select_autoescape(["html","xml","css","js"])`), template
`interactive_flow.html.j2` (`:440`), plus `style.css` (`:413`) and `interactive.js` (`:423`) loaded
from `visualization/assets/` — confirmed present — writing the finished HTML at `:461`.

**➜ F5-9 [PX-F] — The only *generated frontend* in the tree is a self-contained HTML file built
from the same data the engine executes.** **Plain meaning:** the automation graph draws itself, and
because the picture comes from the `FlowDefinition` rather than from hand-drawn markup, the diagram
cannot disagree with the running code. **Why it matters:** *one definition, executed and drawn* is
the property worth stealing. It is also the ONLY renderer here that is generated rather than
hand-authored, and it needs no server — so it is the cheapest possible model for any "show me this
workflow" view we build.

---

## 5.5 The terminal apps

`lib/cli/src/crewai_cli/crew_run_tui.py` — 3,278 lines, docstring: *"Full-screen Textual TUI for
crew execution. Two-column layout: left sidebar (tasks/agents/tokens) + main content (task header,
plan checklist, activity timeline, streaming output)."* (`:1-4`).

It is a real app, not a print loop: a `TraceConsentScreen(ModalScreen[bool])` (`:210`) with its own
`BINDINGS` (`:261`) and `compose` (`:267`); the main `CrewRunApp(App[Any])` (`:409`) with
`BINDINGS` (`:561`) mapping `q`/`s`/`l` to quit/sidebar/logs and `t`/`e`/`d` to
traces/evaluate/deploy (`:562-567`), arrow keys to log scroll, and Enter to expand (`:568-570`);
and `compose` at `:693`. Its colours are a named brand palette (`:33-40`) and its state is explicit
(`:587-624`): `_task_statuses` (`:593`), `_task_state_by_key` (`:600`, with a comment explaining it
keys completion events to the right task *"even when tasks run async/overlapping"*), `_timeline`
(`:602`), token counters (`:605-609`), streaming buffers (`:611-614`), and `_plan_step_status`
(`:617`). It subscribes to the event bus via `textual`'s `@work` (`:25`).

The other three are smaller and each answers one question: `checkpoint_tui.py` (871) — pick a
checkpoint to restore; `memory_tui.py` (393) — inspect memory; `tui_picker.py` (565) — choose
something from a list. `crew_chat.py` is 23 lines (a stub).

**➜ F5-10 [PX-F] — The richest UI is a terminal app that is essentially a *live view of the event
bus*.** **Plain meaning:** the TUI subscribes to the same 163 typed events the engine already
emits (Batch 01 §1.3) and renders them as a sidebar, a timeline, and streamed text. **Why it
matters:** this is a genuinely good architectural lesson independent of the terminal: **the UI is a
subscriber, not a caller.** Nothing in the TUI reaches into the engine; it listens. Whichever
surface we build, an event-bus subscription is the seam that keeps it from coupling to the runtime.

---

## 5.6 Divergences and corrections

| # | Claim | Measured reality | Verdict |
|---|---|---|---|
| **D5-1** | Batch 04 implied triggers exist only in user templates. | The CLI **does** ship a `TriggersCommand` (`triggers/main.py:14`) with `list_triggers` (`:23`) and `execute_with_trigger` (`:37`) — but both call `self.plus_api_client` (`:27`, `:51`), i.e. triggers live on **CrewAI's hosted Plus API**, not in this tree; and execution shells out to `uv run run_with_trigger <json>` (`:127-128`), the template function from Batch 04. | **Rule 13 correction:** triggers are a *hosted SaaS* feature driven *through* the template convention. Batch 04's statement stands for the engine; this adds the delivery path. |
| **D5-2** | The docs are part of the product. | `docs/docs.json` (3.16 MB) is a **Mintlify** site config (`"$schema": "https://mintlify.com/docs.json"`, `"theme": "aspen"`). The site is built and served by a third-party SaaS from markdown; nothing here builds it. | The docs tree is a **claims archive consumed by an external renderer**. Consistent with Batch 00's 33,251-`.mdx` hazard and the method's rule 1. |
| **D5-3** | A2UI is a UI. | Its own `inject_tools` is a **no-op** with the explicit comment *"A2UI uses prompt augmentation rather than tool injection"* (`client_extension.py:212-213`). | It is a **protocol** — a description of UI, plus prompt/response machinery — with no renderer in this tree. Say "widget *protocol*", never "widget system", when writing the SRS. |

---

## 5.7 Gap statement — what the widget/frontend pole can take from CrewAI

| Need (PX-W / PX-F) | CrewAI's offering | Verdict |
|---|---|---|
| A component vocabulary | 18 typed components + bindings + composition + actions (`catalog.py`) | **present, directly reusable as a shape** |
| A render-tree protocol | surface + components + data model + delete + action (`models.py`) | **present, clean** |
| Data binding | literal-or-path `BoundValue` (`models.py:12-26`), JSON Pointers in v0.9 | **present** |
| Widget subsetting / permissions | `allowed_components`, enforced on prompt **and** response (`prompt.py:21`, `client_extension.py:397`) | **present — the key idea** |
| A widget *catalogue version* story | two gardens side by side (v0.8 nested, v0.9 flat) with the deltas documented | **present as a cautionary tale** |
| How the UI is requested | prompt augmentation + response extraction/validation — **not** tool calls | **a choice to make deliberately, either way** |
| A renderer | **none** — no JS, no HTML app, no component runtime | **absent** |
| A frontend build | **none** — no `package.json`, no bundler, no TS | **absent** |
| A live view of a run | Textual TUI subscribing to the event bus (3,278 lines) | **present (terminal)** |
| A generated view of a definition | `flow.plot()` → standalone HTML from the `FlowDefinition` | **present, cheap, correct** |
| A web surface | **none anywhere** | **absent** |

**One sentence for the SRS:** *CrewAI's frontend pole is empty, and its widget pole is a
well-designed **protocol** with a bounded, typed, subsettable catalogue — the vocabulary and the
subsetting rule are worth carrying forward; the renderer, the transport choice, and the whole
frontend layer are ours to build.*

---

## 5.8 Batch 05 — checklist

- [x] Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority.
- [x] Every claim carries `file:line`; citations re-verified with `sed -n`/`grep -n` at write time.
- [x] No platform comparison inside the batch (rule 5).
- [x] Every finding pole-tagged (rule 9); every capability named (rule 6), **including the absences**.
- [x] Divergences recorded, and a **rule 13 correction** of Batch 04's trigger statement (D5-1).
- [x] Retirement rule honoured: nothing deleted to fit a narrative (C13-14).
- [x] 10 findings: F5-1…F5-10.

**Batch 06 (PZ out-of-pole)** takes the cross-cutting material neither P1/P2/P3/PX claimed:
security (`security/`), telemetry/tracing, the auth providers in
`crewai_core/auth` + `cli/authentication/providers/` (auth0, entra_id, keycloak, okta, workos —
the enterprise identity story Batch 02 left open), the MCP/A2A surfaces, the docs practice, and the
`enterprise/` CLI module. It also **closes the tenancy question** Batch 04 §4.6 left open.
