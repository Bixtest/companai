# 02-SRS-06 — The Widget Architecture, End to End *(`B-WS/B9`)*

**Status:** written 2026-10-15, in **`B-WS/B9`**.
**Answers:** the owner's **Q11** — *"the widgetized structure for the dashboard and the workspaces"* — and it
fills, per `03-MAPPING.md` §4, both the **Q11 row** and **R12's BUILD-IT detail** (the frontend workspace
surface).
**Reads from:** `02-SRS-01`…`02-SRS-05` (B3–B7), `02-REFERENCE-SYSTEMS.md` §9 (B8's decision),
`discussion_points.md` **Part 3** (the owner's four decisions of 2026-10-15), and the code it cites.
**Exit gate (`00-RESEARCH-PLAN.md:206`, verbatim):** *"a reader can name **every part of the workspace**
(widget definition, instance, runtime, IR, renderer, registry, reference layer, threads, collaboration,
extension) and for each say **'we have it (here)' / 'we build it (item)' / 'we borrow it (Hermes, the kit)'**."*

**How to read it.** §1 is the **one-page answer** — the scoreboard the exit gate asks for. §2–§6 name each
part in turn. §7 is the **workspace screen** — the surface that does not exist yet, which is what the owner
asked B9 to specify *"including creating the frontend surface if it does not exist."* §8 is the **nugget
model** (the owner's own taxonomy, from DP-11). §9 lists what this batch **cannot** settle. §10 is the
**corrections table** (rule 13).

---

## §1 — The scoreboard: every part of the workspace, and where it stands

| Part | What it is, in one line | **HAVE IT** (path) / **BUILD IT** (item) / **BORROW IT** |
|---|---|---|
| **Widget definition** | the typed object that says *what is presented and how a person interacts* | ✅ **HAVE** — `shared/src/lib/business-widget/types.ts` (`BusinessWidget`, §10/§195; G-07) |
| **Widget IR** | the *semantic* rendering description — deliberately no React/CSS/DOM | ✅ **HAVE** — `business-widget/ir.ts` (§33–35; **no code slot**, `ir.ts:171`) |
| **Widget instance** | a definition **placed** somewhere (a workspace, a document, **a thread**) | ✅ **HAVE (type)** — `WidgetInstance` (`types.ts:362`, "a conversation id" is a named host); ⬜ **BUILD** the placements that use it |
| **Widget runtime** | resolves, gates and renders a placed widget | ⬜ **BUILD** — the kit's runtime loader carries **injection widgets**, not `BusinessWidget`s (see §4) |
| **Renderer** | turns the IR into pixels | ⬜ **BUILD (reuse)** — the Next.js/React frontend **is** the rendering layer (B1's verdict); the semantic renderer for `WidgetLayout` is new |
| **Registry** | the first-class object graph: what exists, what depends on what | ✅ **HAVE** — `business-widget/registry.ts` (`whereUsed`/`dependenciesOf`/`dependentsOf`, §112–114) |
| **Reference layer** | `@`/`#` — mention a thing, reference a thing | 🔶 **PART** — the **`@` call hook** exists (`ui/src/primitives/rich-editor.tsx:1270`); the **resolver** (`G-09`) and the **agent picker** do not. **`#`** unresolved (see §9) |
| **Threads** | the persisted container a workspace shows | ✅ **HAVE** — `AiChatConversation` / `…Participant` / `AiChatMessage` (`data/entities.ts:736/826/899`); 38 tests |
| **Collaboration** | who is in a thread, and what they may do | 🔶 **PART** — humans **HAVE** (roles owner/viewer/commenter); **AI-as-participant is deferred** by the owner's DP-09 ruling (see §5) |
| **Extension** | adding a tool/widget over time | 🔶 **PART** — **Route 1** (platform-shipped) **HAVE**; **Route 2** (tenant-authored) and **Route 3** (AI-proposed) **BUILD** (B7) |
| **Menu join** | a saved Function appears in the interface | ⬜ **BUILD** — `R6`/`CC-62`: `UserFunction` has no `placement` field yet |
| **THE WORKSPACE SCREEN** | the surface where a person types, sees nuggets, and manages threads | ⬜ **BUILD** — **does not exist**; specified in §7 |

**One sentence.** *The definition, IR, registry, threads and the menu's ingredients are ours already; the
**runtime, renderer, screen, reference resolver and the two remaining extension routes** are the build.*

---

## §2 — The widget, defined precisely (so nothing later is ambiguous)

Three words are used loosely everywhere else and must not be here.

| Word | What it is | Where |
|---|---|---|
| **A "widget" (the kit's)** | a **dashboard tile** — a TSX component with a metadata id and injection slots | `shared/src/modules/widgets/` |
| **A `BusinessWidget`** | the **typed object** of §10/§195 — *interaction requirements*, no code | `shared/src/lib/business-widget/types.ts` |
| **A "nugget"** | **the thing a person sees in a thread** — a rendered panel produced by an execution | §8 of this file; the owner's word (DP-11) |

**Rule (carried from G-07, restated because it is load-bearing):** the kit's tile keeps the word *widget*;
the typed object is a **`BusinessWidget`**; the on-screen panel in a thread is a **nugget**. A nugget is
**not** a `BusinessWidget` — a nugget is *what a person sees*, and it is produced by running something.
**A `BusinessWidget` is one of the things that can produce one.** (Recorded in `compai/planning/CHANGELOG.md`
as *our* call, overrulable in one line.)

**The vision's chain, verbatim from `placement.ts` (§160) — the spine of this whole architecture:**

> `AI request → Business IR → result → Save as Function → Function → Widget → Workspace`

**Read against the three decisions of 2026-10-15, the chain extends, it does not change:**

> `AI request → Business IR → result` **→ a nugget in the thread** *(−→ optional: a `%caption%` link, a
> copy-to-new-thread, a toolbar action)*
> `→ Save as Function → Function → Widget → Workspace` *(and the menu, via the join)*

**What the extension means in plain words.** The original chain treats the **result** as a way-station on the
road to a saved Function; the owner's DP-11 makes the **result itself a durable thing a person works with**
(a nugget) *before* — and independently of — any decision to save it. That is the single largest change B9
records, and it is why **§7 (the screen)** and **§8 (the nugget)** are the heart of this file.

---

## §3 — The four shapes of a placed thing (definition, instance, host, placement)

This is §113 of the vision, and it is the piece most likely to be got wrong.

| Shape | Meaning | The vision's name |
|---|---|---|
| **Definition** | one canonical identity + version | `BusinessWidget` (`widgetId`, `version`) |
| **Instance** | a definition **placed** at one spot | `WidgetInstance` (`instanceId`, `widgetId`, `host`, `slot`) |
| **Host** | *where* it is placed — **a workspace, a document, or a thread** | `WidgetInstance.host` |
| **Placement** | the **act** of placing, and the path that results | `business-widget/placement.ts:66` (`placeFunction`) |

**Rule 7, which the whole model rests on:** *"Widget definitions are distinct from widget instances."* One
`savedFunction` placed in five workspaces still has **one** identity and **five** instances — so a permission
change or a version bump touches one thing, not five.

**And the join that feeds it (measured gap, `R6`):** a saved `UserFunction` becomes placeable only when it
carries a `placement` (`FunctionPlacement`, `request-outcome/types.ts:203`) — **the field does not exist on
`UserFunction` today.** That is `CC-62`'s load-bearing item, and nothing in §7 works without it.

---

## §4 — The runtime and the renderer: what renders a nugget

This is where B9's design meets the kit's existing machinery, honestly.

**What the kit has (measured, B7).** A real extension system — **UMES** (`cli/src/lib/umes/collector.ts:8`,
four extension types including `injection-widget`). A module declares a widget as **two files**
(`widgets/injection/<name>/widget.ts` + `widgets/injection-table.ts`, which maps a **named spot** to widget
ids); a **build-time generator** discovers them and a **runtime loader** resolves, gates and renders them.
There are **11 `spotId` mounts** in `AppShell.tsx` (five sidebar-scoped).

**The distinction that matters, stated plainly:** the kit's injection widget is a **component the platform
ships**. A `BusinessWidget` is a **typed object the platform interprets**. They are **not the same
mechanism**, and B9 must not pretend they are:

| | Kit's injection widget | `BusinessWidget` |
|---|---|---|
| What it is | a TSX component | a typed, code-free description |
| Who authors it | us, by shipping code | us, a tenant (later), or the AI (proposing) |
| How it appears | a build-time generator finds it | the **runtime** interprets the IR |
| Where it renders | a fixed `spotId` | a **host** (workspace / document / **thread**) |

**So the runtime is a BUILD, and it has two jobs:**

1. **Resolve** — given a host (a thread, a workspace) and the placed instances, produce the set of widgets
   to render, each carrying its inputs' values *from the sources the IR declares* (§11's
   `WIDGET_INPUT_SOURCES` — `user`, `function_parameter`, `workspace_context`, `selected_records`,
   `widget_output`, `deep_link`, `saved_state`, `ai_proposal`, `schedule`).
2. **Gate** — a widget is usable only when `isWidgetUsable(status)` (`published`/`active`), **and** the
   platform re-checks authorization on every call. **Rule 16, which B9 must carry forward unchanged:** *a
   widget permission never replaces business authorization* — the platform re-checks user, tenant, role,
   policy, record, threshold and workflow state **every time** (§74; `WidgetPermissions` is a
   **declaration for the host**, not the guard — `types.ts:221-226` states this in the code itself).

**The renderer.** B1's verdict stands: *our Next.js/React frontend **can be** the rendering layer.* The IR
targets `renderer: 'semantic'` (§184–185: the runtime is renderer-independent), so the build is a
**semantic renderer** that understands the four `WidgetLayout` shapes (`stack`/`grid`/`tabs`/`split`) and
the `WidgetPresentation` metadata — **not** an AI that writes TSX. **Rule 20 forbids AI from emitting UI
code**, and this is the line that keeps the promise.

---

## §5 — Threads and collaboration, as they stand after the owner's DP-09 ruling

**What is built (measured).** `AiChatConversation` (`entities.ts:736`) with `agentId` (**one** agent the
thread is bound to), `visibility` (`private`/`shared`/`organization`), `status` (`open`/`closed`) and
**`pageContext`** (jsonb, `:776` — the page the thread was started from, which **already reaches the tool
context**, `lib/agent-tools.ts:40`). `AiChatConversationParticipant` (`:826`) with roles
`owner`/`viewer`/`commenter` and soft delete. `AiChatMessage` (`:899`) with `uiParts` (the serialisable
render parts, `:934`), `metadata` (jsonb, `:946`) and the `clientMessageId` idempotency key (`:925`).

**What the owner's DP-09 ruling settles (2026-10-15), and its consequence here:**

> *"we can start by leting human call ai agents. A good compromise is to allow ai agent to recommend adding
> a another ai agent then a human make the call."*

- **Phase one: a human calls an agent.** The call surface is the editor's **`onMention` hook**
  (`ui/src/primitives/rich-editor.tsx:1270`) — the picker is the build.
- **An agent is NOT a thread participant in phase one.** The recommendation ("add agent X") is a
  **message carrying an action a human confirms**, so `AiChatConversationParticipant` **stays human-only**
  and needs **no migration now**. An agent row (a `kind` column) is a **later, additive** change — the
  owner's own "we can add that later if complicated now."
- **Why the deferral is cheap and safe (measured):** the runtime **already** intercepts any
  `isMutation: true` tool call into a **pending action a human confirms**
  (`lib/agent-tools.ts:413-419`), and the authority layer **already** caps every machine actor at
  **approve-first** (`shared/src/lib/authority/decision.ts:205`; obligation `:446`; test
  *"caps an AI worker at approve-first"*, `decision.test.ts:180`). **"AI recommends → human decides" is
  the shape our own runtime already enforces** — reusing it is the whole point.

**This means `R10` ("AI users in a thread") moves from *blocked* to *deferred with a named trigger*** — see
§9 and `03-MAPPING.md` §2 R10.

**A thread is a host.** `WidgetInstance.host` names *"a workspace id, a document id, **a conversation id**"*
(`types.ts:366`) — so **a nugget in a thread is a widget instance whose host is the thread.** This is the
join B6 predicted and B9 now fixes in one line.

---

## §6 — The menu join and the workspace's relationship to it

**The join (`R6`, `CC-62`), unchanged by B9 but restated because §7 depends on it:** a saved Function with a
canonical `placement.path` projects into an `InjectionMenuItem` whose `groupId` is **the path minus its last
segment** (B5 §2e; the projector `menuItemForFunction` is specified in `02-SRS-03` §5.3). **Membership
confers no authority** (`R7`, Buzz's B-5): the projector must **never** read permission from the group.

**Where the workspace sits relative to the menu.** The menu is a **shortcut**; the workspace is the
**surface**. Clicking a menu item drops the Function's widget **into the workspace** (DP-07: the owner
allows **page, panel, or both, chosen per recipe**) — so the same saved Function can be reached two ways and
be the same object.

---

## §7 — THE WORKSPACE SCREEN (the surface that does not exist) — the owner's DP-10 answer, specified

**Measured starting point (so this is not imagination):** there is **no** workspace screen. `apps/mercato`
has no `workspace` page; the backend is a `[...slug]` module-page catch-all. What **does** exist is the AI
chat surface (`ui/src/ai/AiChat.tsx`, `AiDock.tsx`, `conversation-store.ts`) and the persisted thread model.

**The owner's DP-10 ruling (2026-10-15, verbatim):** *"my initial assumption is for the workspace to be the
one place i the platform where we manage threads. But analyze an recommend the best architecure for that."*

**The architecture B9 adopts (the recommendation the owner asked for):**

> **The workspace is the surface. The thread is the container. The dock is the same thread, seen small. A
> thread's page-anchoring is a property it carries.**

Four consequences, each stated as a rule so §7 is buildable:

1. **One thread is open at a time in the surface**; the surface lists the others. This is a **list + one
   open thread**, not a new data model.
2. **The dock and the workspace are the same thread** — opening the workspace shows the thread the dock was
   in. There is **no** second kind of conversation. (`conversation-store.ts` is the existing client-side
   store this rides on.)
3. **Page-anchoring groups, it does not separate.** A thread carries the page it started on
   (`pageContext`); the workspace may therefore group threads by page ("invoices", "customers") **without a
   new feature** — because the property is already stored and already reaches the agent.
4. **Threads are managed here** — create, rename, share (the existing participant roles), archive, and
   **open a new thread from a nugget** (DP-11's copy-to-new-thread).

**What the surface shows, in one picture (plain words, no drawing):**

```
┌─ THE WORKSPACE ───────────────────────────────────────────────────────────┐
│  [ threads list ]        [ the open thread ]                              │
│  • Invoices — open            you: "top customers by revenue this quarter" │
│  • Q3 numbers — live          ┌ nugget ─────────────────────────────────┐ │
│  • Customers — archived       │ <table of rows>          %q3_top%  ⋯   │ │
│                               │ toolbar: [save as function] [export] …  │ │
│                               └────────────────────────────────────────┘ │
│                               you: "great, now compare to last year"     │
│                               assistant: ↳ (runs again, new nugget)       │
└──────────────────────────────────────────────────────────────────────────┘
```

**The bits of that picture, each traced to its part:** *threads list* → `AiChatConversation` (HAVE);
*the open thread's messages* → `ai_chat_messages` (HAVE); *a nugget* → §8 (BUILD); *`%q3_top%` in a nugget*
→ §8's caption (BUILD); *the toolbar* → §8 (BUILD); *"save as function"* → `R4`/`CC-32` (BUILD, gated on
`G-09`).

**Explicitly NOT in this screen (so it is not built by accident):** the **Studio** (the management hub —
a separate workstream, WS-2/B-studio); the **database editor**; the **visual data editor** (the owner's
DP-15 ruling defers these).

**The one small open item DP-10 leaves** (recorded, not decided here, because it is the owner's to feel by
seeing the screen): **one thread per page per person, or many?** Both are supported by what is built — they
are different products (one re-opens the same conversation; the other lets you start a second without losing
the first). It is listed in §9.

---

## §8 — The nugget: the owner's DP-11 taxonomy, specified

**The owner's words (2026-10-15, verbatim):** *"each data 'nugget' in the thread can have a caption that if I
add anywhere in the chat like %caption_name% and click on it, either it opens as a modal (maybe better this
way so the user stays in the chat whee he is) or the chat scrolls up to show the user that data. Also, there
can be a feature for a data nuget to copy it to a new thread created to discuss it. We should have functions
toolbar for data nuggets … For now I can convert the function that generated that data to a permanent
function and save it in menu category … we should be able to call saved functions from within the thread
whether the function nugget is data output …, data analysis and processing, or input form."*

### 8.1 The three kinds

| Kind | What it is | What produces it | Measured state |
|---|---|---|---|
| **Output nugget** | shows data from the database in a certain way | the Business-IR chain (prompt → IR → compile → execute) | the **chain is built** (341 tests; `CC-59` caller landed 2026-10-11); **no screen shows it** |
| **Analysis nugget** | processing / analysis on that data | the same read path, a different IR | same as above — it is one chain, not two |
| **Form nugget** | a form that **adds data to the existing schema** | a `BusinessCommandIR` executed through the command bus | the **type** exists; the **form** and the **write gates** do not (§8.4) |

### 8.2 The caption link — `%caption_name%`

- A nugget carries a **caption** (its name).
- Typing `%name%` **anywhere in the chat** turns it into a live link.
- **Clicking it either opens the nugget as a modal (the owner's lean — *"so the user stays in the chat"*) or
  scrolls the chat to it.** B9 adopts **modal-first**, with scroll-to as the fallback for a nugget already
  on screen.
- **Measured:** the `%word%` shape collides with **nothing** in the messages module (a regex scan of the
  ai-assistant module for `%[a-zA-Z_]\w*%` returned **0 matches**).
- **The rule that must be written down (B9's recommendation, raised as a challenge in Part 3):** *a caption
  counts only when the token names a nugget that **exists in that thread**.* Without it, *"sales are up 5%
  this month"* is ambiguous. One line; adopt it now.

### 8.3 Copy a nugget into a new thread

A nugget action: **create a new thread, and place the nugget in it** — the owner's *"copy it to a new thread
created to discuss it."* In the model of §3 this is **one more instance** of the same widget in a new host
(a new thread) — **not** a copy of the data. (Which is the whole reason definitions and instances are
separate: the "same report" is one object in two threads.)

### 8.4 The functions toolbar, and what it may do **now**

A toolbar on every nugget, **growing over time**. The owner names the growth path (convert to report,
export…) and fixes **what is available now**:

> *"For now I can convert the function that generated that data to a permanent function and save it in menu
> category."*

So the **only** toolbar action in phase one is **"Save as Function"** → which lands in **`R4`** (the save
step, gated on `CC-32`/`G-09`) → which lands in the **menu** via **`R6`** (the join, `CC-62`). Everything
else (convert-to-report, export) is a **later addition to the same toolbar**, which is why the toolbar is
designed as a **list of actions** from the start.

### 8.5 The form nugget, and the add-data path — "make sure the architecture is clear and ready"

The owner asked for this **explicitly**, so B9 states it plainly rather than leaving it implied.

**The write path, in one line:** a `BusinessCommandIR` **names an existing command and its inputs** —
`{ command, inputs, requested_by, idempotency_key }` (`business-ir/types.ts:213-218`), carried on
`UserFunction.businessCommandIr?` (`user-function/types.ts:126`), schema at `business-ir/schema.ts:303/:342`.
`request-outcome/types.ts:122` already classifies *"writes to **existing** structure"* as exactly this IR.
**This is precisely the owner's "we are not changing the data schema, we are adding data to the one that
exists."** The architecture **is** ready, and it is ready *because* the type for it already exists.

**The two conditions that are NOT ready, stated honestly:**

| Condition | State | Why it matters for a form nugget |
|---|---|---|
| **Idempotency** | the field exists (`idempotency_key`); **the form must set it** | a Save clicked twice must not write twice |
| **Risk / approval declared** | **0 of ~93 commands declare them** (`CC-63`, from `CC-61`) | today a form would write **without saying how risky it is or whether it needs approval** |

**Therefore B9's sequencing rule:** design the form nugget's **face** now (done, here); wire its **write
path after** the two gates exist. This is the same discipline as DP-12: *"make sure all is documented in the
right sequence so it gets developed when the prerequisite is developed."*

### 8.6 Calling saved functions from inside a thread

The owner: *"we should be able to call saved functions from within the thread whether the function nugget is
data output …, data analysis and processing, or input form."* In this architecture that is **one** mechanism
— a thread places a **widget instance** whose definition is the saved Function — so the three kinds of
saved Function differ only in which IR they carry (query / query / command). **This is what makes the three
kinds one architecture rather than three features** — and it is the main reason §3's definition/instance
split is load-bearing.

---

## §9 — What B9 does NOT settle (stated so nothing is mistaken for decided)

| # | Open item | Whose | Trigger |
|---|---|---|---|
| 1 | **One thread per page per person, or many?** (DP-10's small leftover) | **owner** — best decided by seeing the screen | when the workspace screen is demoed |
| 2 | **`#` references** (the vision's `@`/`#` system: `@` a colleague, `#` a thing) — B9 confirms **`@`** and the agent picker; **`#`** (referencing a *record/entity* by name) is **unresolved**, and `G-09` is its home | design/batch | with `G-09` |
| 3 | **The modal vs scroll preference** — B9 adopts **modal-first** (the owner's lean) as a **design default**, reversible | owner may overrule | any time |
| 4 | **AI-as-participant** (the participant `kind`) | owner's ruling **defers** it (DP-09) | when direct agent participation is wanted |
| 5 | **The advanced data-anchoring** (comment a specific cell/row) | owner **parked** it (DP-11) → `BACKLOG.md` **`N-22`** | owner asks, or `CC-47` completes |
| 6 | **Route 2 / Route 3 extension builds** | scheduled | behind WS-1 (B-perms), per B7/DP-12 |

---

## §10 — Corrections recorded in this batch (rule 13)

| # | Was (in an earlier document) | Is (measured 2026-10-15) | Where corrected |
|---|---|---|---|
| 1 | `R10` — *"AI-as-participant … **blocked on `DP-09`**"* | **DP-09 is answered (2026-10-15): deferred, not blocked** — phase one is human-invoked; an agent participant is a **later additive** change. `R10`'s blocking language is superseded. | this file §5; `03-MAPPING.md` §2 R10 (B10) |
| 2 | `R1`/`R2`'s `CC-60` pointer — *"the tool has no in-chat consumer"* | **`CC-60` is DONE (2026-10-13, `P2-4`)**: `ai-agents.ts:181-213` declares `business_ir.query_runner` with the tool whitelisted | `COMPLETION-CALLBACKS.md` (corrected 2026-10-15), carried into `03-MAPPING.md` (B10) |
| 3 | the vision's §160 chain ends at *"→ Workspace"* | the owner's DP-11 puts a **nugget** between *result* and *save* — the chain **extends**, it does not replace | this file §2 |
| 4 | *(B8, §5b)* the `run.ts` execute-region citation is wrong in **four more files** | recorded; **not** fixed in this batch (it is not B9's subject, and the owner's live queue deserves its own pass) | carried forward in §9 of this file's notes / `03-MAPPING.md` §5b (B10) |

---

## §11 — The exit gate, checked honestly

**The gate asks:** *a reader can name every part of the workspace and say have-it / build-it / borrow-it.*

- **Every part named?** Yes — §1 names all ten the gate lists (definition, instance, runtime, IR, renderer,
  registry, reference layer, threads, collaboration, extension), **plus** the menu join and the screen.
- **Each given a destination?** Yes — every row of §1 carries a path, or a named item, or a state.
- **Is the frontend surface specified?** Yes — §7, with its rules, its picture, and what is **not** in it.
- **Is the nugget model specified?** Yes — §8, the owner's taxonomy, the caption, the copy, the toolbar, and
  the honest state of the add-data path.
- **What is still open, and whose?** §9, six items, each with a trigger.

**What this batch does NOT claim:** that any of it is **built**. B9 is a **design** — bridge rule **BR-4**
(*"a design is never a build"*). The builds it names are `CC-62` (the join + thread lifecycle + anchoring +
routes), the workspace screen, and the write gates; none is started by this document.

---

*Written 2026-10-15 in `B-WS/B9`. Owner: Ramzi. Next: `B-WS/B10` (the final mapping + the decisions list).*
