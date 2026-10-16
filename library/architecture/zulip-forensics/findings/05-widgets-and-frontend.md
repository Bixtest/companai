# Zulip Study — Batch 05: widgets & frontend (PX-W / PX-F)

**Status:** DONE · **Date:** 2026-10-16 · **Poles:** **PX-W (widgets) + PX-F (frontend)**
**Source:** `library/architecture/platforms/_extracted/zulip-main/` @ `12.0-dev+git`

**The question this batch answers:** *does Zulip have a widget model, and how is its client
built?* The pin's probe said yes. **This batch confirms it — and Zulip is the first platform in
this study with a genuine, schema-validated, event-sourced widget architecture.** The rest of the
batch reads the frontend (PX-F): a hand-written TypeScript SPA on jQuery, with a bundling and
templating story that is deliberately old-school and completely un-React.

**Headline:** Zulip's widget model is built on a **`SubMessage` table** — an append-only log of
interactions attached to a message — with a **zod discriminated-union schema** on the client and
a **`GenericWidget` registry** on the server's transport. It is not a *plugin system* (the doc
says so outright: *"Right now we don't have a plugin model"*), but it is the first *composition
model* the study has found.

---

## §5.1 ★ PX-W: a widget is a SubMessage log, not a config object

The architecture (`docs/subsystems/widgets.md`, traced to code): a **`SubMessage` row**
(`zerver/models/messages.py:331-346`):

```python
class SubMessage(AbstractSubMessage):
    message = models.ForeignKey(Message, on_delete=CASCADE)
```

Each widget interaction — a vote, a todo check-off, a zform click — is a **new `SubMessage`
row** (`msg_type="widget"`, `content` = JSON) appended to the parent message. **This is an
append-only, event-sourced model**: the *current state* of a poll is the **replay of all its
submessages**. The doc says it plainly: *"The server's only real role is to decide who gets
delivered which submessages. It's a lot like a 'subchat' system."*

**Why this matters, and why it is the study's first true PX-W:**

| Property | How Zulip does it |
|---|---|
| **State is derived, not stored** | No `poll_state` column — the votes *are* the rows |
| **Multi-user interaction is native** | Every participant appends; the server broadcasts submessages via the **existing event system** (batch 01's Tornado pipeline) |
| **Late joiners are correct by construction** | A client opening an old message *replays all submessages* before rendering (`widgetize.ts:62-72`: *"Replay any events that already happened"*) |
| **No new transport** | The widget reuses the message-event machinery — no second channel |

**★ The replay comment in code** (`web/src/widgetize.ts:62-69`) is the clearest statement of the
model: *"If there are no events to replay, don't annoy the widget by making it handle the
degenerate case."* The architecture assumes **the widget is a state machine driven by an event
log** — and the server is deliberately dumb.

---

## §5.2 The contract: a zod discriminated union

`web/src/widget_schema.ts` (37 lines — small, precise):

```ts
export const any_widget_data_schema = z.discriminatedUnion("widget_type", [
    z.object({widget_type: z.literal("poll"), extra_data: poll_widget_extra_data_schema}),
    z.object({widget_type: z.literal("zform"), extra_data: z.nullable(zform_widget_extra_data_schema)}),
    z.object({widget_type: z.literal("todo"), extra_data: z.nullable(todo_widget_extra_data_schema)}),
]);
export type AnyWidgetData = z.infer<typeof any_widget_data_schema>;
```

**Three widget types, each with its own schema module** (`poll_data.ts` 283 lines,
`todo_data.ts` 296 lines, `zform_data.ts` 28 lines). The `zform` schema is the *generic* one
(`zform_data.ts`):

```ts
export const zform_widget_extra_data_schema = z.object({
    choices: z.array(z.object({
        type: z.string(), long_name: z.string(), reply: z.string(), short_name: z.string(),
    })),
    heading: z.string(),
    type: z.literal("choices"),
});
```

**The validation happens in two places (rule 6 — name the mechanism):**
1. **Server-side, before storage** — `check_message` validates `widget_content` *before* it is
   trusted, and `zerver/lib/widget.py` says so in a comment: *"Note that we validate this data in
   `check_message`, so we can trust it here."*
2. **Client-side, at parse** — the zod schema, so a widget can never render on a malformed
   payload.

---

## §5.3 The abstraction: a `GenericWidget` registry with a capability check

`web/src/generic_widget.ts` (114 lines) is the composition surface. The key mechanisms:

**A registry** (`generic_widget.ts:31-44`):

```ts
export const widgets = new Map<string, WidgetImplementation>();

export function is_supported_widget_type(widget_type: string): boolean {
    if (widgets.has(widget_type)) {
        return true;
    }
    if (widget_type === "tictactoe") {
        return false; // don't warn for deleted legacy widget
    }
    blueslip.warn("unknown widget_type", {widget_type});
    return false;
}
```

**★ `tictactoe` — a DELETED legacy widget.** The code keeps a **deliberate exception** so that
old messages containing a retired widget type do not produce warnings. **This is rule 10 in a
single line**: the widget ecosystem has already had a retirement, and the codebase carries a
scar for it. `is_widget_message` (`zerver/lib/widget.py`) — *"all messages that are widgetized
use submessage, and vice versa"* — is the invariant that ties the two halves.

**The `WidgetImplementation` interface** (`generic_widget.ts:17-29`) — every widget must provide
exactly two functions:

```ts
type WidgetImplementation = {
    activate: (data: {message: Message; any_data: AnyWidgetData}) => {
        inbound_events_handler: HandleInboundEventsFunction;
        widget_data: WidgetData;
    };
    render: (data: {$elem: JQuery; callback: (data: WidgetOutboundData) => void;
                    message: Message; widget_data: WidgetData; rerender: boolean}) => void;
};
```

**`activate` builds the state machine; `render` paints it.** Outbound interaction is a
black-box `post_to_server` callback (`generic_widget.ts:95-99`, in a comment: *"a black-box
service that sends any events **outbound** to the other active users"*). The comment at
`:46-49` is honest about the debt: *"Eventually we will have concrete classes for PollWidget,
TodoWidget, and ZformWidget, but for now we need this wrapper class."* And `:14-16`: *"They are
currently injected into us from another module for historical reasons. (as of January 2026)"* —
**the registry is populated by injection, not import, and the code says why.**

---

## §5.4 The generic widget: zform — how a third party gets a button UI without touching Zulip

The doc's own framing (`widgets.md`): a trivia bot wants buttons, not "@bot answer A". **zform**
is the answer, and it is *completely generic* — any bot can send a `choices` payload and the
client renders buttons whose `reply` field is sent as a normal chat message on click
(`widgets.md` zform section). **The bot stays an ordinary bot** (it grades the answer "using
ordinary chat-bot coding"); the *buttons* are the only thing the platform renders.

**★ This is the study's first genuine bot↔widget bridge, and it flows both ways:**
- **Bot → widget:** the bot framework's `send_reply` accepts an optional `widget_content`, which
  the server validates (`check_widget_content`) and stores as a `SubMessage` (batch 02 §2.5).
- **Widget → bot:** a click posts a `SubMessage`, which is broadcast; the bot receives it as a
  chat message and replies normally.

**"Any third party developer can enhance bots… without touching any Zulip code"** — the doc's
claim, and the schema (`zform_data.ts`) confirms it is schema-driven, not code-driven.

---

## §5.5 What PX-W does NOT have (measured, so the negative is solid)

| Capability | Present? | Evidence |
|---|---|---|
| **A typed widget contract** | ✅ yes — zod discriminated union | `widget_schema.ts` |
| **Event-sourced widget state** | ✅ yes — `SubMessage` log + replay | `messages.py:331`, `widgetize.ts:62-72` |
| **A bot↔widget bridge** | ✅ yes — zform + `widget_content` | `widgets.md`, `widget.py` |
| **A widget registry with capability check** | ✅ yes — `widgets` Map + `is_supported_widget_type` | `generic_widget.ts:31-44` |
| **A plugin/sandbox model for widgets** | ❌ **no** | *"Right now we don't have a plugin model"* (doc) |
| **Dynamic loading of external widget code** | ❌ no | widgets are compiled into the bundle |
| **A composer/editor for widgets** | ❌ no | (the `/poll` slash command is a parser, not an editor) |
| **Widget schema versioning** | ❌ **no, and the doc admits it** | *"This has yet to be designed"* |
| **Mobile widget parity** | ❌ no | doc: *"Other clients just show raw messages like '/poll'"* |

**★ The three most honest lines in the whole batch are in the doc's own limitations section:**
*"Right now we don't have a plugin model… anybody who wishes to build their own widget has the
option of forking the server code."* · *"This has yet to be designed"* (versioning) · *"most
widgets are somewhat ephemeral in nature, so it's not the end of the world if upgrades cause
some older messages to be obsolete."* **Zulip has a widget model and explicitly declines to
make it a plugin system** — that is a *decision*, recorded.

---

## §5.6 PX-F: the frontend is jQuery, hand-written TypeScript, and 8 bundles

| Fact | Value | Evidence |
|---|---|---|
| TS modules under `web/src` (top level) | **393** `.ts` files (**471** `.ts`+`.tsx` across all `web/`, **153,253 LOC**) | measured |
| Handlebars templates (`web/templates`) | **462** `.hbs` | `find` |
| Widget templates | **7** (`poll_widget`, `todo_widget`, `zform_choices`, + examples/results) | `web/templates/widgets/` |
| CSS files (`web/styles`) | dozens, incl. `dark_theme.css`, `light_theme.css`, `app_variables.css` | `ls` |
| Webpack bundles | **8** (`app`, `common`, `hello`, `help_bundle`, `integrations_bundle`, `legacy_portico_bundle`, `marketing_page`, `showroom`) | `web/src/bundles/` |
| Framework | **none** — jQuery + hand-written modules | `import {$} from "jquery"` throughout |
| E2E tests | 21 TS files under `web/e2e-tests` | `find` |

**The architecture, named:**
- **A module-per-feature convention.** `compose_*.ts` (×20), `message_*.ts` (×30),
  `settings_*.ts` (×20) — the file *is* the feature, and the name tells you what it is.
- **A small `components.ts` (218 lines)** of hand-built UI primitives — `toggle`, popovers,
  typeahead — built on jQuery. There is **no design-system package** like n8n's 129 components.
- **`blueslip`** — Zulip's own client-side error reporter (used by the widget registry to
  `warn` on unknown types). **Error reporting is a first-class module, not a `console.log`.**
- **Server-rendered HTML + hydration** (`web/templates/*.hbs`), not a client-only SPA. The
  message feed is the app; portico pages are separate bundles.

**The bundle split is a deliberate performance boundary:** the marketing page and the help
centre do not ship the chat app's JavaScript. `common.ts` holds what every page needs.

---

## §5.7 The `/poll` parser: the only "composer" Zulip has

`zerver/lib/widget.py`'s `get_widget_data` is a **slash-command parser**, not a UI:

```python
def get_widget_data(content: str) -> tuple[str | None, Any]:
    valid_widget_types = ["poll", "todo"]
    tokens = re.split(r"\s+|\n+", content)
    if tokens[0].startswith("/"):
        widget_type = tokens[0].removeprefix("/")
        if widget_type in valid_widget_types:
            remaining_content = content.replace(tokens[0], "", 1)
            extra_data = get_extra_data_from_widget_type(remaining_content, widget_type)
            return widget_type, asdict(extra_data)
    return None, None
```

`/poll Question` pre-fills a question; `/todo Title` pre-fills a task list. **The "composer" is
typing a slash command, and the web client's `widget_modal.ts` + `web/templates/widgets/`
collect the rest.** There is **no drag-and-drop builder** anywhere in the tree.

---

## §5.8 Divergences and honest limits (batch 05)

| # | Divergence / limit | Detail |
|---|---|---|
| **D5-1** | **The doc contradicts the code on file names** | `widgets.md` cites `web/src/submessage.js`, `poll_widget.js`, `zform.ts`; the tree has `widgetize.ts`, `poll_widget.ts`, `zform_data.ts`, `widget_data.ts`. **The doc has aged** — rule 1 in action, and the *architecture* (submessage log) is unchanged while the *filenames* moved. |
| **D5-2** | **`GenericWidget` is a transitional wrapper** | `generic_widget.ts:46-49` says so: concrete classes are planned, this is interim. The registry-by-injection (`:14-16`, "historical reasons (as of January 2026)") is acknowledged debt. |
| **D5-3** | **A deleted widget leaves a scar** | `tictactoe` is special-cased in `is_supported_widget_type` to suppress warnings. |
| **D5-4** | **No schema versioning — by decision, not oversight** | The doc proposes it ("would be worthwhile to add some kind of versioning scheme… This has yet to be designed") and accepts obsolescence for ephemeral widgets. |
| **D5-5** | **Mobile/other clients show raw text** | The widget experience is web-only today; the graceful-degradation path (show `/poll`) is the design. |

---

## §5.9 Batch-05 verdict

Zulip has the study's **first real widget model**, and its centre is one idea: **a widget is an
append-only log of interactions attached to a message** (`SubMessage`), replayed by every client
that sees it, with **no second transport** — the normal message-event system carries the
submessages. On top of that sits a **zod discriminated-union contract** (validated server-side
by `check_message` *and* client-side), a **`GenericWidget` registry** with an
`activate`/`render` capability pair, and a **generic zform** that lets any third-party bot put
buttons in a message without touching Zulip code.

**What Zulip explicitly does NOT have**, and says so: **a plugin model, dynamic loading, a
visual composer, and schema versioning** — all four are named as deliberate gaps or "has yet to
be designed."

**PX-F is the opposite of n8n.** Where n8n shipped a 129-component design system, its own ESLint
plugin and CRDT collaboration, Zulip ships **jQuery, 393 top-level feature modules (471 across
`web/`), 462 hbs templates, 8 bundles, and `blueslip`** — and is completely unapologetic about
it. **The
trade-off to carry forward:** Zulip's frontend is *readable and ordinary* but has no reuse
mechanism beyond "another file"; n8n's is *systematised and enforced* but heavy.

---

*Batch 05 · Zulip · the study's first widget model · a submessage log, a zod union, a
GenericWidget registry · zform bridges any bot · no plugin model — by decision.*
