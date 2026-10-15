# Batch 05 — Widgets and Frontend (PX-W / PX-F)

**Study:** Gas Town `1.2.1` · **Batch:** 05 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **Method:** rules 1-10 of `00-PIN-AND-METHOD.md`.
Every claim carries `file:line`. Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

Two cross-cutting questions. **PX-F** is how the surface is built and wired; **PX-W** is the composable UI
surface.

Short answer, measured:

| Question | Gas Town's answer | Where |
|---|---|---|
| What are the surfaces? | **Three**: the CLI (292 commands), a **Bubble Tea** TUI (2 surfaces), and a web dashboard | F05-01 |
| Which is primary? | **The CLI** — everything else is a second door onto it | F05-05 |
| How is terminal output styled? | **Lipgloss over an Ayu theme** in `internal/ui/`, with a shared semantic palette | F05-02 |
| How does it degrade for machines? | **Agent mode returns raw text** — no colour, no glamour | F05-03 |
| What is the web dashboard? | **One page, 13 panels**, HTMX 1.9.10 + SSE, driven by a 14-method fetcher | F05-04 |
| **Is there a widget model?** | **No.** Measured: zero composers; "widget" appears in 7 files, all incidental | F05-06 |

---

## 1. The surface inventory, measured

| Surface | Files | Lines | What it is |
|---|---:|---:|---|
| **CLI** (`internal/cmd/`) | ~150 | **103,691** | 292 commands — the primary surface |
| **Web dashboard** (`internal/web/`) | 12 + 3 assets | **15,488** *(css 3,770 · js 3,232 · html 1,079)* | one page, 13 panels |
| **TUI** (`internal/tui/`) | 11 | ~4,319 | Bubble Tea, two surfaces |
| **Style / theme** (`internal/ui/`, `internal/style/`) | 6 | ~1,503 | Lipgloss + Ayu |

**The ratio is the finding.** The **CLI is ~5× the entire web + TUI layer combined** (103,691 lines vs
19,807), and ~7× the dashboard alone (15,488). Gas Town is a terminal product with a dashboard attached
— the same shape Multica had (a shared frontend dwarfing the apps), but pointed at a different end of the
same idea.

---

## 2. The CLI is the UI — and its styling degrades for machines

### 2.1 A themed style layer

`internal/style/style.go:1-2` — *"Package style provides consistent terminal styling using **Lipgloss**.
Uses the **Ayu theme** colors from `internal/ui` for semantic consistency."* The palette is small and
semantic, not decorative: `Success`, `Warning`, `Error`, `Info` (each with its own colour from the theme).

`internal/ui/` adds the rendering pieces: `markdown.go` (**glamour**), `pager.go`, `styles.go`,
`terminal.go`.

### 2.2 The degradation rule

`internal/ui/markdown.go:11-13` — and the same pattern repeats down the file:

> *"Returns raw markdown on failure for **graceful degradation**."* … *"**agent mode outputs plain text for
> machine parsing**"*

`RenderMarkdown` therefore **returns the raw markdown** when `IsAgentMode()` is true or colour is
disabled — with the reason stated. This is batch 03's ZFC/graceful-degradation principle in the
presentation layer: a machine-readable form exists and is chosen deliberately.

*(`getTerminalWidth` caps wrapping at 100 characters — *"research suggests 50-75 optimal, 80-100
comfortable"* — falling back to 80. A measured default, stated.)*

---

## 3. The TUI — Bubble Tea, one surface at a time

`internal/tui/` holds **two** surfaces, each in the standard Bubble Tea shape (`model.go`, `view.go`,
`keys.go`):

- **`convoy/`** — the convoy tracker (`internal/tui/convoy/`)
- **`feed/`** — the live activity feed (`internal/tui/feed/`), whose files (`convoy.go`,
  `convoy_issues.go`, `events.go`, `mq_source.go`) show it subscribing to several event sources

The dependency is real: **4 files import `charmbracelet/bubbletea`** (plus `bubbles/help`,
`bubbles/key`) — the TUI is built on the ecosystem's standard framework, not a hand-rolled renderer.

**And the feed carries a retirement in its own source** (`tui/feed/mq_source.go:8-9`):

> *"`MQEventSource` was used to read MQ lifecycle events from `mq_events.jsonl`. **The `mrqueue` package
> has been removed**, so this is now a **no-op stub**. MR events can be observed via beads activity
> instead."*

`NewMQEventSource` *"creates a stub source that produces no events."* The seam was kept and the
implementation removed — the CrewAI lesson (`a seam nobody populates is indistinguishable from a feature
nobody shipped`) in a third platform, and here the code says so in its own comment.

---

## 4. The web dashboard — one page, thirteen panels

### 4.1 The shape

`internal/web/templates/convoy.html` is **1,079 lines** containing **13 panels** (measured: 13 ×
`class="panel"`, 13 × `panel-header`) inside a `panels` grid with `panel-tabs`, plus a **command
palette**, mail **compose/reply** forms, and convoy create/add-issue flows. `dashboard.css` (3,770 lines)
and `dashboard.js` (3,232 lines) are **embedded** (`//go:embed static`).

**The page ids show the surface's vocabulary**: `activity-timeline`, `command-palette-overlay`,
`compose-subject`/`compose-body`/`compose-mail-btn`, `convoy-create-*`, `convoy-add-issue-*`,
`connection-status`.

### 4.2 The wiring: HTMX + SSE

`dashboard.js:22-31` opens an **`EventSource('/api/events')`** with reconnect backoff (1s → 30s max) and
a live connection indicator; the template loads **HTMX 1.9.10**; and the top of the script installs
**CSRF protection** — *"Inject dashboard token into all POST requests to prevent cross-site request
forgery"* — reading a `meta[name="dashboard-token"]`.

**So the dashboard is server-rendered with partial updates (HTMX) pushed by server-sent events (SSE)** —
no build step, no framework bundle, one CDN script.

### 4.3 The data model is an interface

`internal/web/handler.go:23-37` declares `ConvoyFetcher` with **14 methods** — `FetchConvoys`,
`FetchMergeQueue`, `FetchWorkers`, `FetchMail`, `FetchRigs`, `FetchDogs`, `FetchEscalations`,
`FetchHealth`, `FetchQueues`, `FetchSessions`, `FetchHooks`, `FetchMayor`, `FetchIssues`,
`FetchActivity`.

**That interface is the dashboard's entire information architecture.** Whatever a dashboard needs, it
must ask for through one named method — so adding a view is adding a fetcher method, and the page and
the API cannot drift apart.

### 4.4 The cache exists because the CLI is slow

`handler.go:53-55` — *"Response cache: prevents **cascading `bd` process storms** when multiple browser
tabs or htmx auto-refresh requests arrive faster than fetches complete. See **GH#2618**."* And the
handler carries `cacheTTL`, `cacheInUse` (*"serializes concurrent fetches (only one runs at a time)"*) and
a per-view `expandCacheEntry`.

**The finding, stated plainly:** the dashboard is fast only because it **throttles the thing underneath
it** — each panel fetch shells out to `bd` (batch 01 §2.3), so two tabs refreshing at once would spawn a
storm of processes. That is the real cost of the "one surface, two doors" design, and the code names it
with an issue number.

---

## 5. One command surface, two doors

Recapped from batch 01 because it is the frontend architecture: the dashboard does **not** reimplement
anything. `POST /api/run` takes a `gt` command string (`web/api.go:25`), and the panels read from the
same ledgers and the same `bd` CLI the human uses.

**Three surfaces, one implementation** — the CLI, the Bubble Tea TUI and the HTMX dashboard are three
renders of one command surface. That is why the CLI is 103,691 lines and the rest is 15,488.

---

## 6. No widget model — the negative, measured

The PIN asked whether a widget model exists. Measured: **it does not.**

- A search for `widget` / `composer` / `component registry` across `.go`, `.js`, `.html` and `.css`
  finds **7 files, all incidental** — e.g. `cmd/hook.go:90` uses *"Fix the widget bug"* as an **example
  subject** in a help string, and the rest are test fixtures and formatters.
- There is no component registry, no composer, no arrangement surface.

**The dashboard is a fixed grid of 13 panels with tabs** — a wall, not a composable surface. A user
cannot add, remove or arrange a panel; they can filter and navigate.

**This is the fourth platform in the study with no widget architecture** (Paperclip, CrewAI and Multica
had none either). Recorded as the PX-W verdict.

---

## 7. The retirement ledger (rule 10)

| Where | What was retired | Why |
|---|---|---|
| `tui/feed/mq_source.go:8-9` | the **`mrqueue` package**, and its `mq_events.jsonl` event source | *"The mrqueue package has been removed, so this is now a no-op stub … MR events can be observed via beads activity instead"* |
| *(earlier batches)* | roles → TOML; provider switches → a struct; per-agent hook packages → one installer; decision engines; legacy DB names | — |

**The pattern across five batches is now unmistakable:** Gas Town's frontend is not where its
distinctiveness lies — it is where things are **removed**. A package is dropped, its seam is left as a
stub, and the replacement (read beads activity) is named in the same comment.

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F05-01** | **Three surfaces, one implementation** — the CLI (292 commands), a Bubble Tea TUI (2 surfaces), and an HTMX/SSE dashboard; the CLI is ~7× the other two combined. | PX-F | Use whichever surface fits: a terminal, a TUI, or a browser. | One command surface, many renders — no second source of truth. |
| **F05-02** | **A themed, semantic terminal style layer** — Lipgloss over an Ayu theme, with a small palette (`Success`/`Warning`/`Error`/`Info`). | PX-F | Output is consistent and readable. | A shared visual language across every command. |
| **F05-03** | **Agent mode returns raw text** — `RenderMarkdown` skips glamour and colour when a machine is reading. | PX-F/PZ | Scripts and agents can parse output reliably. | The presentation layer has a deliberate machine mode. |
| **F05-04** | **The dashboard's information architecture is an interface** — `ConvoyFetcher` with 14 named fetch methods. | PX-F | The page and the API cannot drift. | Views are declared as data contracts, not ad-hoc calls. |
| **F05-05** | **The dashboard throttles what it stands on** — a response cache with a serialising mutex, added because two refreshing tabs would cause *"cascading `bd` process storms"* (GH#2618). | PX-F/PZ | The page stays responsive. | The cost of one-surface-two-doors is measured and documented. |
| **F05-06** | **No widget model** — 0 composers; "widget" in 7 incidental files; the UI is a fixed 13-panel grid with tabs. | PX-W | (n/a) | A clear negative: the composition layer is not here either. |
| **F05-07** | **The TUI is Bubble Tea, one surface at a time** (`convoy/`, `feed/`), each in model/view/keys form. | PX-F | A live terminal view without leaving the shell. | The terminal surface is a first-class, framework-built one. |
| **F05-08** | **A removed package left as a no-op stub**, with the replacement named in the same comment. | PZ | (indirect) | A seam nobody populates — and this time the code says so. |
| **F05-09** | **The dashboard is server-rendered with no build step** — HTMX 1.9.10 + SSE + a CSRF meta token, all assets embedded. | PX-F | No toolchain to run it. | A frontend that ships inside the binary. |

---

## 9. Divergences and honest bounds

- **No doc-vs-code divergence was needed**; the frontend's behaviour matches its comments, and the one
  notable decision (the cache) is documented with an issue number.
- **Bound:** this batch read the **surfaces** — the CLI's style layer, the TUI, the dashboard, and the
  absence of a widget model. It did **not** read `dashboard.js`'s 3,232 lines line by line, nor every
  panel's template; the surface shape, its wiring, its data contract and its cost are what is claimed.
- **Bound:** `internal/ui/`'s colour constants (the Ayu palette) were **located** (`ColorPass`,
  `ColorWarn`, `ColorFail` used by the style layer) but the full palette was not transcribed.
- **Bound (stated plainly):** the "no widget model" verdict rests on a search for `widget`/`composer`/
  `component registry` across the tree. A composition surface under an unexpected name would not be
  caught by that search; the honest phrasing is *"no widget or composer model exists under any name this
  batch searched for."*

---

## 10. Carried forward to batch 07 (the synthesis)

Two candidates for the highest transferable value, to be ranked in batch 07:

1. **One command surface, three doors (F05-01)** — the CLI, a Bubble Tea TUI and an HTMX/SSE dashboard,
   all reading the same 292 commands, with the CLI dwarfing the other two. A cheap and honest way to ship
   three surfaces.
2. **The fetcher interface as information architecture (F05-04)** — 14 named methods that define what the
   dashboard may ask for, so page and API cannot drift.

All are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 05 of 07. Read from source on 2026-10-15. Next: `findings/06-out-of-pole.md`.*
