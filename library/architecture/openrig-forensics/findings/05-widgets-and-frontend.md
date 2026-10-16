# OpenRig Study — Batch 05: widgets and frontend (PX-W / PX-F)

**Folder:** `library/architecture/openrig-forensics/` · **Batch 05 of 08** · **Status:** OPEN
**Poles:** **PX-W — the widget/composition surface** and **PX-F — the frontend architecture**
**What this batch answers:** is there a *composition model* in OpenRig (a widget tree, a canvas of
composable elements, a registry a third party can extend)? And how is the frontend actually
architected — what the two frontends are, how the design system is enforced, and what the
verification story is.

**Rule 5 reminder:** no comparison to our own platform appears in this batch.

**Rule 1 reminder:** every claim was read from source; divergences are in §9.

---

## 1. The one-sentence shape

**OpenRig has TWO frontends and NEITHER is a composition surface: a hand-rolled ANSI terminal
UI (the primary, 191 files / 29,473 lines, *zero* JSX) and a React web UI in *maintenance mode*
(538 files / 88,829 lines) — and the question "is there a widget model?" answers NO: there are
no composable UI elements, no canvas that holds them, and no registry a third party extends.
The one composition-shaped system in the codebase is a CONTENT composition system (Context
Packs), which composes *prompt text*, not *UI*.**

This is the **sixth platform in the study with no widget/composer model** (Paperclip, Multica,
Gas Town, buzz, and now OpenRig; n8n is the only one with a real one). But OpenRig answers the
*spirit* of the widget question in two unusual places — a **digital-twin harness** that
generates clickable mockups from the real components, and a **command registry** that makes an
undocumented action impossible by construction. Both are in this batch.

The nine ideas in this batch, each read from source:

| Idea | Owner | § |
|---|---|---|
| the TUI is hand-rolled ANSI, no React | `packages/tui/src/render.ts` | 3 |
| the render/stylize split + its invariant | `render.ts` + `stylize.ts` + `canvas.ts` | 4 |
| the **command registry** (one source of verbs) | `tui/src/commands/registry.ts` | 5 |
| the TUI status glyphs (honest-unknown) | `tui/src/topology/glyphs.ts` | 6 |
| the web UI is in maintenance mode | `docs/reference/developing.md` | 7 |
| the design system (Vellum / Black Glass) | `docs/DESIGN.md` + `tailwind.config.ts` | 7 |
| **★ the digital-twin harness** | `packages/ui/twin/**` | 8 |
| Context Packs = *content* composition | `domain/context-packs/**` | 8.4 |
| the as-built UI docs (self-audited) | `docs/as-built/ui/**` | 7.5 |

---

## 2. The composition answer, measured first (rule 0b)

Before interpreting anything, the counts. "Widget" and "composer" are the two words that most
often *look* like a composition model while meaning something else, so both were counted tree-wide.

| Token | Files (tree-wide, `.ts`/`.tsx`) | What the hits actually are |
|---|---|---|
| `widget` | **5** | **all incidental.** Three are OpenRig *quoting Codex's own source filenames* in comments (`chatwidget.rs`, `tui/src/chatwidget/streaming.rs`); one is a test fixture whose sample text is *"approval requested for the widget refactor"*; one is `setWidget`/`widgetKey:"autoresearch"` — an **OMP provider extension-UI call**, i.e. *the provider's* widget protocol, not OpenRig's. |
| `composer` | 8 (in `packages/ui/src`) | **none is a UI composer.** Every hit is a *server-side text composer*: the daemon "review composer" that assembles a review payload, the fleet-glance composer, and `TerminalLauncher`'s *"the C3 canonical composer"* (a `POST /api/terminal/open` endpoint). It composes **strings**, not elements. |
| `WidgetRegistry` / `widgetRegistry` | **0** | no widget registry of any kind |
| `dashboard` / `Dashboard` | 22 | route/page names, not a tile system |
| `slot` / `Slot` | 15 | mostly `hsl` slot naming and CSS; no plugin-slot mechanism |

**Check-then-conclude.** There is no `CREATE TABLE widgets`, no `registerWidget`, no element
schema, no drop-target model, no third-party UI extension point. **OpenRig's UI is a fixed set of
purpose-built surfaces; the product answer to "add a surface" is "edit the app"** — which is exactly
what the digital-twin harness (§8) exists to make cheap.

---

## 3. The two frontends, measured

| Package | Files | `.ts` / `.tsx` | Lines (`.ts`+`.tsx`) | Role |
|---|---|---|---|---|
| `packages/tui` | 191 | 185 / **0** | **29,473** | **the primary, shipped, human interface** |
| `packages/ui` | 538 | 175 / **348** | **88,829** | the React web UI — **in maintenance mode** |
| `packages/cli` | 490 | 468 / 0 | 121,520 | the scriptable surface (not a frontend; noted for scale) |

`packages/ui` decomposes as: **70 top-level `components/*.tsx`**, **23 component subdirectories**,
**22 UI primitives** in `components/ui/`, **67 hooks**, **30 lib modules**, **199 test files**.

The single most striking frontend fact is in the TUI row: **348 `.tsx` in the web UI, zero in the
TUI.** The TUI is not React-for-terminal (no Ink, no React, no reconciler — `grep '"ink"'` on
`packages/tui/package.json` returns nothing). It is a **hand-rolled renderer over raw ANSI**:

> `// Hand-rolled ANSI renderer (Phase-0 substrate decision). Pure function:
> (state, snapshot) → {lines, hitMap, explorerRows}.`
> — `packages/tui/src/render.ts:12`

`render.ts` is **1,874 lines** and is explicitly a *substrate decision*, reversible behind a seam:
> `// Isolated seam: a substrate swap touches only this module (spike verdict revisit trigger).`

That is a *decided limit* stated as a decision with a named revisit trigger — the same discipline
seen throughout this study (Gas Town's "top 4 mechanisms are DECIDED LIMITS"). *(PX-F.)*

---

## 4. ★ The render/stylize split, and the invariant that makes styling safe

The TUI separates **layout** from **ink** into two passes, and the split is load-bearing:

1. **`render.ts`** (1,874 lines) — the *plain* layer. Pure: `(state, snapshot)` → `{lines, hitMap,
   explorerRows}`. No colour. This is what the tests assert against.
2. **`stylize.ts`** (238 lines) — the *style* pass, applied **AFTER** layout. It injects only
   zero-width SGR escape sequences.

The invariant, test-pinned:

> `// INVARIANT (test-pinned): stripAnsi(styled[i]) === plain[i] for every line — styling can
> // never move a hit target or shear a frame. Segment-painted (no nested wraps), so resets
> // never bleed.`
> — `packages/tui/src/stylize.ts:3`

This was **verified, not assumed**: `stripAnsi` appears in **11 TUI test files**, and the
assertion is written the same way each time (`styled.forEach((l, i) => expect(stripAnsi(l)).toBe(
screen.lines[i]))`). So the claim "styling cannot change behaviour" is *enforced by the test suite*,
not merely intended. *(PX-F — the sharpest frontend discipline in the platform.)*

**And there is a second, stronger form of the same invariant.** In the graph renderer the invariant
is made **structural** rather than regex-checked:

> `// Every cell carries an optional semantic token; plainLines() and paintedLines() are generated
> // from the SAME cells, so stripAnsi(painted) === plain holds BY CONSTRUCTION (the shipped
> // stylize invariant, kept structural instead of regex-matched).`
> — `packages/tui/src/topology/canvas.ts:3`

`canvas.ts` is a **character canvas**: each `Cell` holds `{ch, token?, bold?, bg?}`; the plain text
and the painted text are two *projections of one grid*; and mouse hit-zones (`CanvasZone`) are
recorded **in plain-character coordinates on the same grid**. **Colour is a projection; geometry is
the truth.** *(PX-F — carry this to the SRS.)*

---

## 5. ★ The command registry — "an undocumented action is impossible by construction"

`packages/tui/src/commands/registry.ts` (338 lines) is declared as **the ONE command registry**:

> `// REGISTRY I1 (ruling 64f1dbdf) — the ONE command registry, sole source of the TUI's command
> // surface. A UI action cannot exist without an entry here: the grammar (grammar.ts) DERIVES its
> // verb table, arg validation, and error listings from this registry, so an undocumented action
> // is impossible BY CONSTRUCTION (PM pin 1's parity suite enforces it at CI). Render surfaces
> // (the CLI dump, the palette, the socket query — I2-I4) are SERIALIZED projections of these
> // entries, never hand-maintained (PM pin 2). 'context' is the honest-availability qualifier
> // (PM pin 3): "always" renders in every state; "standard" requires the normal daemon-up shell.`

And `grammar.ts` (41 lines) obeys it:
> `// the verb table is DERIVED from the ONE command registry (commands/registry.ts) — an
> // unregistered verb cannot parse, so an undocumented action is impossible by construction.`

**Why this matters (rule 6 — name the capability):** this is a **single-source command surface with
a CI parity gate**. Three separate render surfaces (help dump, command palette, socket query) are
*generated* from the registry and cannot drift from it. The parity test is real —
`packages/tui/test/command-registry-parity.test.ts` exists, alongside `parity.test.ts` and
`parity-content.test.ts`. **The TUI cannot advertise a command it cannot run, or run one it does not
advertise.** *(PX-W/PX-F — this is the closest OpenRig comes to a "composition registry", and its
scope is *commands*, not *elements*.)*

---

## 6. The TUI's section model and the honest-unknown glyphs

The TUI exposes **11 sections** (`packages/tui/src/sections.ts`, 35 lines), each shipped with an
explicit declaration of **what it reads and how it drills** — a one-line contract per section:

| Section | Declared source read | Drill shape |
|---|---|---|
| `topology` | (rig projection) | host → rig → pod → seat |
| `specs` | spec-library | library → spec |
| `scopes` | scopes projection | — |
| `terminals` | `GET /api/terminal/views?detail=1` + `/api/terminal/preview` (**passive**) | saved/derived → view → page |
| `needs` | attention projection | — |
| `system` | `GET /api/health` (canonical instance findings) | health/configuration/connections |
| `config` | `/healthz` + `/api/config?view=browser` + `/api/gateway/connections` (**passive**) | category → setting |
| `connections` | `/healthz` + `/api/gateway/connections` (**passive projection**) | instance → human/routes → work |
| `usage` | `GET /api/provider/status` (**memory-only read; never the refresh**) + `/api/config?view=browser` *only when usage is absent* | provider → allowance → window; seats |
| `usage-hosts` | `GET /api/provider/usage/hosts` (**memory-only reads here and on each registered host; never the refresh**) | hosts; allowance → host → window; seats per host |
| `cost` | `GET /api/telemetry/usage/cost` (**the daemon's stored usage samples; starts no lookup**) | seats |

Two disciplines are visible in this table, and both are **rule-6-grade**:
1. **A read is declared *passive* or *memory-only* where it matters.** A *viewing* surface that must
   never *trigger* a provider lookup says so in the section's own definition
   ("never the refresh"). **A read-only screen that cannot accidentally spend money.**
2. **`cost` reads *stored samples* and "starts no lookup"** — the honest distinction between
   *what the daemon already knows* and *what would require asking a provider*.

**The status vocabulary.** `packages/tui/src/topology/glyphs.ts` (75 lines) reduces state to a
**4-glyph vocabulary**, and the header states the honesty rule directly:

> `// The 4 buckets COLLAPSE the richer existing states; nothing here invents state, and a
> // projection with no value renders honest-unknown ○ (PIN-2 as a glyph — NEVER a fabricated ●).`
>
> `● active/done · ◐ partial/% (amber-attention family) · ○ queued/unknown (honest-unknown) · ✕ failed`

Edge kinds map to **line COLOUR, not labels** (`delegates_to` = accent/teal · `collaborates_with`
= ok/green · `escalates_to` = warn/amber), and **any other served kind renders `dim` — "the kind
string is data — unknown kinds are not forced into a bucket."** *(PX-W: a rendering vocabulary that
refuses to fabricate a state it was not given.)*

---

## 7. The web UI — in maintenance mode, with a design system worth keeping

### 7.1 The status, and the wording rule
`docs/reference/developing.md` states the status and then **forbids stronger language**:

> `The web UI is **experimental**, in **maintenance mode**, supported **best-effort**; **the CLI is
> primary**. There is no scheduled removal and PRs are welcome. **Do not describe the UI with
> stronger end-of-life language than this section uses.**`

This is a **rule-6 / rule-13 discipline encoded as a documentation policy** — the repo pre-commits
to the *exact* strength of its own status claim, and forbids drift in either direction. *(PZ-adjacent:
an honesty rule that binds future contributors.)*

Consequences, stated in the same file: **daemon API changes no longer require browser verification**;
**the hook "contract mirrors" under `packages/ui/src/hooks/` are no longer proactively maintained**;
and *"a new `test:ui` failure usually signals a moved API contract."* The browser suite is
**advisory locally and not part of `npm test`** (per `docs/as-built/test-layers.md`). **The cost of
maintenance mode is stated, not hidden.**

### 7.2 The design system — a real one
`docs/DESIGN.md` (**358 lines**, 13 sections) is the canonical visual spec, and its own opening
says it exists *"so the product can be recreated, extended, or translated into other media without
reverse-engineering the UI from code."*

- **Two surface languages, deliberately distinguished.** **Vellum Paper** (persistent surfaces:
  sidebars, cards, drawers, viewers — translucent white, `backdrop-blur-[8px]`, 1px outline, hard
  shadow on paper only, registration marks, *"Square corners everywhere except tiny status dots"*)
  and **Black Glass** (temporary previews: terminal popovers, image proof overlays — floating,
  no hard shadow *"or black borders"*). The rule *"Vellum should never become fully transparent"*
  is a stated preference with a fallback (*"increase opacity before adding heavy borders"*).
- **Tokens are the contract.** `packages/ui/src/globals.css` (687 lines, **54 custom properties**)
  defines the token set; `tailwind.config.ts` maps it. The naming is **Material-3-role-shaped**
  (`--on-surface`, `--surface-container-high`, `--inverse-surface`, `--outline-variant`) rather
  than raw hues — so a theme swap rewrites values, not every call site.
- **Aesthetic choices encoded as config.** `borderRadius` is `0px` for **every** step with exactly
  one documented exception (`full: "9999px" /* Exception: stamp circles only */`); the type scale is
  **10 role-named steps** (`display-lg`…`label-sm`) with line-height/weight/letter-spacing baked in;
  one named easing, `transitionTimingFunction.tactical`.
- **A "Do And Do Not" list that reads as a review checklist**: do keep square geometry and 1px lines;
  do *"translate raw event/state codes into human-readable labels"*; **do not** *"add new one-off
  card styles when a primitive can do the job"*; do not *"duplicate runtime/tool brand logic
  outside `runtime-brand.ts`, `tool-brand.ts`, and `RuntimeMark.tsx`."* The last one is a **named
  single-source rule for brand graphics** (rule 6 — a capability, not a vibe).
- **Motion is deliberate and accessible**: *"Prefer slow pulses to blinking"*; *"Honor
  `prefers-reduced-motion`: remove pulse/travel animation and keep static state signals."*

### 7.3 The two themes are token cascades
`lib/theme.ts` offers **Vellum Light, Vellum Dark, and System** (default `system`), stored under
`openrig.theme`; `applyTheme` toggles a `.dark` class on `<html>` which switches the `.dark {}` token
block in `globals.css` (line 603). There is even a **pre-paint script in `index.html`** mirroring the
storage key — **so the theme cannot flash before hydration**. *(PX-F: a small detail that is a real
care signal.)*

### 7.4 The topology surface
`docs/as-built/ui/topology.md` (144 lines) documents the route family. The graph is built on
**`@xyflow/react ^12.10.1`** (React Flow), with `HybridTopologyNodes.tsx` exporting
`HybridAgentNode` (compact agent cards: runtime badges, context %, token totals, activity state,
terminal preview, per-card open) and `HybridPodGroupNode` (soft dashed pod frames). **One canvas
that holds nodes and edges — a *graph*, not a *canvas of widgets*.** The distinction is the whole
point of this batch: React Flow makes the topology *visual*, but the node types are **fixed in
code**, not *composed by a user*. *(PX-W: a graph view is not a composition surface.)*

### 7.5 The as-built UI docs are self-audited
`docs/as-built/ui/` (4 modules) is written in a house style worth naming as a capability:
front-matter carries **`last-verified-against-source: <commit SHA>`** and `last-updated`; the body
states the commit *and the package version*; and the reconciliation is explicit:

> `// Verified against source at e8f0ab34; package version 0.6.7. Component and primitive names
> // below are reconciled against packages/ui/src/components/, NOT TAKEN ON TRUST from DESIGN.md's
> // lists.`
> — `docs/as-built/ui/library-specs-and-design-system.md`

It also carries a **pointer-not-copy ruling (Q1 ratified)**: the module *"points to [DESIGN.md]
rather than copying it,"* so there is exactly one canonical design spec. And it corrects its own
predecessors — e.g. *"`SpecsTable.tsx` is still in the folder but nothing imports it"*, and a
**do-not-back-attribute** guard (*"The plugin primitive is a 0.3.1 feature… Do NOT back-attribute
… to 0.3.0"*). *(Rule 1 as a documentation practice: the doc names the commit it was verified at,
and names its own dead files.)*

---

## 8. ★ The digital-twin harness — the platform's answer to "how do you prove the UI changed?"

OpenRig's most original frontend artifact is not a component — it is a **verification harness**.
`packages/ui/twin/` builds the **real** `@openrig/ui` App with **dummy data** into **one
self-contained, double-clickable `intent.html`**.

> `// Builds the real @openrig/ui App with dummy data into ONE self-contained, double-clickable
> // intent.html — so an agent can fork a feature-version, change the one thing a slice proposes,
> // and emit a clickable mockup that is 1:1 with the live UI by construction (it IS the real
> // components; it never needs manual re-syncing).`
> — `packages/ui/twin/README.md`

**The per-slice loop is three steps:** change one value in `twin/fixtures.ts` (or the component) →
`npm run twin:build` (which runs `tsc -p tsconfig.twin.json` first) → screenshot. `TWIN_ROUTE`
targets a specific surface (`TWIN_ROUTE=/topology/rig/rig_delivery npm run twin:build`).

**The seams are daemon-free, and named** (`twin-main.tsx` installs three, *before any `@openrig/ui`
module imports*):
- **cache-seed** (`seed.ts`) — seeds the react-query cache from **typed fixtures** under the exact
  queryKeys, `staleTime:Infinity`/`retry:false`. *"Instant first paint."*
- **fetch stub** (`fetch-stub.ts`) — a `globalThis.fetch` override answering `/api/*` from the same
  fixtures. The README explains *why it is needed*: several hooks hardcode `staleTime:0 +
  refetchInterval` and would background-refetch even when seeded. **Explicitly NOT MSW / no service
  worker.**
- **EventSource stub** (`eventsource-stub.ts`) — no-op for live SSE *except* it emits a seeded set of
  activity events on `/api/events` so the SSE-driven feed renders 1:1.

**★ The drift guard is the point (FR-4 / D-2).** `twin:build` typechecks first, and the fixtures are
typed against the **REAL exported hook interfaces** (`RigSummary`, `NodeDetailData`, …):

> `// so a real-interface change BREAKS the twin build = compile-time drift detection. (Proven: a
> // string where a number is required fails with TS2322.)`

**A mockup that cannot silently drift from the app, because it is compiled against the app's own
interfaces.** Six surfaces are seeded and listed as **"1:1 verified"** (Dashboard, Topology graph,
Live node details, For-You feed, Workspace, Library), and the README honestly lists its own
**known follow-up** (graph node badges read stale) and a **test-invisible footgun** (component-scoped
CSS font stacks must lead with the registered `… Variable` family or fall through to the system font
silently — *"jsdom can't catch it in a unit test"*). *(Rule 1 as a build artifact: the harness
documents the failures its own tests cannot see.)*

**The capture tooling** (`twin/capture/`, README + `twin-capture.ts` + `asciicast.ts` +
`payload-diff.ts` + `headless-chrome.ts`) generalizes "prove it" per medium:
- **screenshot** (intent) and **screenshot** (proof) — *the same `buildChromeScreenshotArgs`, only
  the URL differs* (`file://` twin vs `http://` real UI), **paired by file base**
  (`<surface>.intent.png` ↔ `<surface>.proof.png`) *"so the founder can compare them directly."*
- **asciicast v2** for CLI work — *"emits the documented asciicast v2 format directly (zero-dep)…
  asciinema is NOT required… Never fake a capture; degrade honestly."*
- **payload-diff** for data-shape slices — canonical before/after JSON + sorted changed paths.
- **Determinism is enforced, not assumed**: *"enforce D-1 determinism (shoot twice, byte-compare,
  fail loudly on drift)."*

**Why this is the batch's headline.** A digital twin of the UI, compiled against the UI's own
interfaces, with a **mandatory intent-vs-proof pairing** and **byte-level determinism enforcement**,
is a *verification* answer to the composition question. OpenRig has no widget model — **but it has a
way to prove a UI change is real that is stronger than most systems that do.** *(PX-F; and PZ-tier.)*

### 8.4 The one composition system — and why it is *not* widgets
`Context Packs` (`packages/daemon/src/domain/context-packs/**`; **101** `.ts`/`.tsx` files touch the
term) are OpenRig's **content** composition system. A pack is a `manifest.yaml` + declared members;
its path-like **ref is the lookup identity, independently of the manifest name/version**; the entry
id is `context-pack:<ref>`. The doc names **five separate projections** over the same content:
*framed preview* (`assembleBundle()`, with token estimates and `missingFiles`), *plain composition*
(`assemblePlainFiles()`, present files in declared order, **"without framing or trimming their
bytes"**), *addressed read* (`/library/resolve-address` — longest pack-ref prefix, then a declared
file, then optional H2/H3 heading selection), *situation profile* (`composeProfile()` — select atoms,
close dependencies, order and resolve), and *named profile* (`composeNamedProfile()`).

The atom model has **runtime awareness** (`Claude | Codex`, with `any` atoms applicable to either),
**dependency closure that fails loudly** (*"missing dependencies or runtime-incompatible
dependencies fail composition"*), and honest skips (*"Post-compaction composition skips an absent
`seat:RECAP.md` and reports it as skipped instead of failing"*). Packs can also carry `.sh`, `.ts`,
`.py` helper assets — **but *"Those assets are served as text; pack assembly does not execute
them."***

**So OpenRig has a composition system — of PROMPTS.** Atoms compose into a prompt; dependencies close;
profiles select. **Nothing composes into a UI.** *(PX-W: the study must not mistake a content
composition system for a widget model. This is the most tempting near-miss in the study so far.)*

---

## 9. Divergences (rule 1)

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D5-1** | `docs/DESIGN.md:7` says the web UI *"is in maintenance mode"* | confirmed verbatim by `docs/reference/developing.md:52`, and **self-consistent** with the test-layers note (advisory, not in `npm test`) | **HOLDS** (and the *wording rule* makes it unusually precise) |
| **D5-2** | earlier batches / general expectation that a modern TS monorepo's TUI uses Ink or React | **zero React/Ink in `packages/tui`**; `render.ts` is a hand-rolled ANSI renderer declared as a *substrate decision* | **DIVERGED from expectation, HOLDS against source** (and the seam is declared) |
| **D5-3** | `packages/ui/README.md` described as the package doc in some trees | **there is no `packages/ui/README.md`**; the canonical docs are `docs/DESIGN.md` + the 4 `docs/as-built/ui/` modules + `packages/ui/twin/README.md` | **DIVERGED** (doc lives in `docs/`, not the package; noted so the reader does not look for it) |
| **D5-4** | `docs/DESIGN.md` lists "core primitives" as the design system | the primitive list is **real** — every named primitive resolves to an export at the stamped commit — **but `DESIGN.md` is a *pointer*, and the as-built module is explicit that it did not take the list on trust** | **HOLDS** (verified by the codebase's own self-audit) |
| **D5-5** | the twin's six surfaces are described as "1:1 verified" | accurate *as scoped*, and the README **names its own exception**: graph node badges read STALE/UNKNOWN because per-node live activity comes from SSE + clock-freshness, not the static graph fixture | **HOLDS — with a self-declared exception** (the harness documents what it does not yet prove) |

---

## 10. Findings (batch 05)

**F5-1.** ★★★ **OpenRig has NO widget/composer model — the sixth platform in the study with none.**
Measured: **5** `widget` files (all incidental — Codex source filenames in comments, a test fixture,
and the *OMP provider's* `setWidget`), **0** `WidgetRegistry`, and **8** `composer` hits that are all
*server-side text composers*, not UI. The node types in the React Flow topology are **fixed in code**;
there is no user-facing element registry or drag-compose surface. *(PX-W — the headline answer.)*

**F5-2.** ★★ **The closest thing to composition is a CONTENT composition system: Context Packs.**
A `manifest.yaml` + declared members with **atoms, dependency closure, runtime selection
(`Claude | Codex | any`), and named profiles**, plus five distinct projections over the same content
(framed / plain / addressed / situation / named). **It composes prompts, never UI.** Helper assets
are *"served as text… [and] not execute[d]."* *(PX-W — the near-miss the study must name.)*

**F5-3.** ★★★ **★ The digital-twin harness: the real UI, compiled against the real hook interfaces,
emitted as one double-clickable file — with compile-time drift detection.** `tsc -p
tsconfig.twin.json` runs first; a changed interface **breaks the twin build** (`TS2322`). Three named
daemon-free seams (cache-seed / fetch stub / EventSource stub; *"NOT MSW"*). *(PX-F/PZ — top-tier.)*

**F5-4.** ★★ **Intent and proof are the SAME capture mechanism, paired by file base, with determinism
enforced at runtime.** *"the same `buildChromeScreenshotArgs`, only the URL differs"*; screenshots
pair `<surface>.intent.png` ↔ `<surface>.proof.png`; **D-1 determinism = "shoot twice, byte-compare,
fail loudly on drift."** *(PX-F.)*

**F5-5.** ★★★ **The TUI's render/stylize split carries a TEST-PINNED invariant: styling cannot change
behaviour.** `stripAnsi(styled[i]) === plain[i]`, asserted in **11 test files**, with `stylize.ts`
described as *segment-painted (no nested wraps)* so resets cannot bleed; and in the graph renderer the
same invariant is made **structural** — plain and painted lines are *two projections of one character
grid*, and hit-zones are recorded in **plain-character coordinates on the same grid**. *(PX-F —
carry to the SRS.)*

**F5-6.** ★★ **The ONE command registry makes an undocumented action impossible by construction.**
`commands/registry.ts` is the sole source of the TUI's command surface; `grammar.ts` **derives** its
verb table, arg validation and error listings from it; three render surfaces (help dump, palette,
socket query) are **serialized projections** of the entries. Enforced by a **parity suite at CI**
(`command-registry-parity.test.ts`). *(PX-W/PX-F — a registry capability, scoped to commands.)*

**F5-7.** ★ **Every TUI section declares WHAT it reads and HOW it drills — and marks a read
"passive" or "memory-only" where it matters.** `usage` reads *"memory-only… never the refresh"*;
`cost` reads *"the daemon's stored usage samples; starts no lookup."* **A read-only surface that
cannot accidentally spend money.** *(PX-F — a declarative surface contract.)*

**F5-8.** ★ **The TUI's status vocabulary is 4 glyphs, collapsing existing states and rendering
honest-unknown — "NEVER a fabricated ●".** Unknown *edge kinds* render `dim` rather than being forced
into a bucket: *"the kind string is data."* *(PX-W — a rendering vocabulary that refuses to invent
state.)*

**F5-9.** ★★ **The web UI's status is fixed by a "wording rule" that BINDS FUTURE CONTRIBUTORS.**
*"The web UI is experimental, in maintenance mode, supported best-effort; the CLI is primary… Do not
describe the UI with stronger end-of-life language than this section uses."* The costs are stated
too (no browser gate; hook "contract mirrors" no longer proactively maintained). *(PZ-adjacent — an
honesty rule inscribed in the repo.)*

**F5-10.** ★ **The design system is a real, token-driven system with two named surface languages.**
687-line `globals.css` with **54 tokens** in M3-role naming; **Vellum Paper** (persistent) vs
**Black Glass** (transient preview) as a *rule*, not a taste; **zero border-radius everywhere with
one documented exception**; **10 role-named type steps**; a `tactical` easing; a **Do-And-Do-Not
checklist** including a **named single-source rule for brand graphics**. *(PX-F.)*

**F5-11.** ★ **The web UI has a pre-paint theme script and an OS-following default** (Vellum Light /
Vellum Dark / System), so **the theme cannot flash before hydration**; theme is a token cascade
(`.dark {}` block), not per-utility overrides. *(PX-F — a small but real care signal.)*

**F5-12.** ★ **The as-built UI docs are SELF-AUDITED: front-matter carries
`last-verified-against-source: <commit SHA>`, and the body reconciles component names against source
"not taken on trust from DESIGN.md's lists".** They also carry a **pointer-not-copy ruling (Q1)** —
one canonical design spec — and name their own dead files (`SpecsTable.tsx`: *"nothing imports it"*).
*(Rule 1 as documentation practice; PZ-tier.)*

**F5-13.** ★ **The UI package is honest about the failures its own tests cannot see.** The twin README
documents a **test-invisible footgun** (component-scoped CSS font stacks must lead with the
registered `… Variable` family or fall through to the system font **silently** — *"jsdom can't catch
it in a unit test"*) and a **known follow-up** (graph badges render stale). *(Rule 1; PZ-tier.)*

**F5-14.** **OpenRig has no third-party UI extension point.** Unlike a plugin-slot or widget-registry
system, "add a surface" means *edit the app*. **This is a decided limit, not an omission** — and the
twin harness exists precisely to make that edit cheap and provable. *(PX-W — the negative, stated.)*

**F5-15.** ★ **The TUI, not the web UI, is the shipped primary interface, and it is deliberately
hand-rolled** — *"Hand-rolled ANSI renderer (Phase-0 substrate decision)"* with an *"isolated seam"*
so a substrate swap *"touches only this module,"* and a named *"revisit trigger."* *(PX-F — a decided
limit with a stated reversal path.)*

---

## 11. Plain-English summary of batch 05

**OpenRig does not have widgets — and it is not hiding any.** I counted the two words that usually
signal a composition model. `widget` appears in **five files**, and every hit is someone else's word
(Codex's own source filenames quoted in comments, a test fixture, and the OMP provider's own
`setWidget` extension call). `composer` appears eight times, and every hit is a **server-side text
composer** — code that assembles a *string*, not a UI. There is no widget registry, no element
schema, no place a user assembles a screen. **That is the sixth platform in this study with no widget
model.**

But two things in OpenRig's frontend are genuinely first-rate, and both answer the *spirit* of the
composition question:

**The first is a digital twin.** OpenRig builds its **real** UI, with dummy data, into one
double-clickable HTML file — so anyone can change one value, rebuild, and get a **clickable mockup
that is 1:1 with the live app by construction, because it *is* the app's components.** The clever
part is the drift guard: the twin is **typechecked against the real hook interfaces**, so if someone
changes a real interface, **the mockup build breaks on purpose.** And the capture tooling pairs an
*intent* screenshot with a *proof* screenshot from the real running UI and **refuses to accept
nondeterminism** (it shoots twice and byte-compares). This is stronger UI-change verification than
most systems have.

**The second is the styling invariant.** The terminal UI — which is the *real* shipped interface,
hand-written against raw ANSI with no React at all — computes its layout with **no colour**, then
paints colour on in a second pass. And it *proves*, with a test repeated in eleven files, that
**stripping the colour back out gives you exactly the original** (`stripAnsi(styled) === plain`).
In the graph view it goes further: the plain and painted versions are **two projections of one
character grid**, so the invariant *cannot* be violated by construction. **Colour can never move a
clickable target.**

Alongside these: a **single command registry** that makes an *undocumented* action impossible (the
grammar is generated from it, and a CI parity test enforces it); a **design system** with a real
token layer and two named surface languages (translucent "paper" for permanent things, dark "glass"
for quick previews); and a web UI whose status is written so precisely that the repo's own docs
**forbid anyone from describing it more harshly.** The web UI is in **maintenance mode** — the CLI is
primary — and the costs of that choice are stated, not buried.

The most tempting near-miss is **Context Packs**: a real composition system, with atoms,
dependencies, and profiles — **but it composes *prompts*, not screens.** A content composition
system is not a widget model, and this study must not blur the two.

**Next: batch 06 — out-of-pole (PZ).** The guards (docs guard, internal-leak scanner, portability
report), the scenario harness, bundle integrity, and the capability-registry self-destruct.

---

*Batch 05 of 08 — widgets and frontend (PX-W / PX-F). All claims read from source at `0.6.10`.
5 divergences; 15 findings (F5-1..F5-15).*
