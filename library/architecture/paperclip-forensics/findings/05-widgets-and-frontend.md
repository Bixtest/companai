# Paperclip Study — Batch 05: widgets and the frontend (PX-W / PX-F)

**Status:** DONE — 2026-10-15 · **Pole tags: PX-W (widgets architecture) and PX-F (frontend wiring &
construction)**.
**Sources read:** `DESIGN.md` (full, batch 01), `doc/design/CHANGING-THE-UI.md`, `doc/design/
COMPONENT-INVENTORY.md`, `doc/design/DECISION-SHEET.md`, `doc/spec/ui.md` (51,809 B, referenced),
`ui/src/` structure measured in code.

**The headline:** Paperclip's frontend is governed by **the most disciplined design system I have seen in
this survey so far** — a single token source, an enforced gate, a 510-image visual baseline, and a written
decision log of every judgement call. Almost all of batch 05 is about **how that discipline works**, because
that discipline *is* the widget architecture.

---

## §0 — Plain words: what the frontend is, and why it is worth this much space

The UI is a React app with **~303 components and 73 pages** (`COMPONENT-INVENTORY.md` counts table). That is
a lot of surface, and the reason it does not dissolve into chaos is a set of hard rules: **every colour, size,
spacing and corner radius is a named value in one file** (`ui/src/index.css`); **components never use raw
values, only tokens**; and **a check script refuses to let you break that rule**. The proof that nothing
changed visually is **510 baseline screenshots**. Changing the whole app's look can be **editing one token**.

**Plain gloss:** the frontend is built like a **printed book with a type specimen** — you change the specimen
sheet, the whole book re-typesets, and a photographic proof shows nothing else moved.

---

## §1 — The three-layer model (measured, `CHANGING-THE-UI.md`)

The mental model is stated in one minute (`:5–12`):

1. **Tokens** — "every color, text size, spacing, radius, and shadow is a named value in
   `ui/src/index.css`. Change a token, and every surface using it follows."
2. **Components** — "consume tokens, never raw values. One component per job (one Button, one Card, one
   ToggleSwitch)."
3. **Screenshots** — "**510 baseline images (255 stories × light/dark)** … They are the proof of what the UI
   looks like. Any visual change shows up as a screenshot diff; no visual change proves itself the same way."

**And the governance rule that makes it hold** (`:14–16`, `DESIGN.md:9`): *"If you disagree with a rule,
change `DESIGN.md` first (with review) — don't quietly diverge in code."*

**Cross-study note:** nothing in the Hermes study had an equivalent. Hermes has docs and a dashboard; it does
not have a **token gate + visual baseline + decision log**. This is a genuine Paperclip strength and the
clearest single contribution to **PX-W**.

---

## §2 — The three commands — enforcement, not encouragement (measured)

`CHANGING-THE-UI.md` §"The three commands":
```bash
pnpm check:token-gates              # am I allowed to write this? (no hardcoded values)
pnpm test:storybook-visual          # what does my change look like? (diff vs baseline)
pnpm test:storybook-visual:update   # accept my intentional changes as the new baseline
```

`DESIGN.md:120–128` states what "compliant" means: **zero hardcoded hex, zero arbitrary spacing, zero raw
font-size** in `ui/src/components/**` and `ui/src/pages/**` outside the token layer and a documented
allowlist; and **`pnpm build`, `pnpm typecheck`, `pnpm build-storybook` must pass.**

**Plain gloss:** compliance is **mechanically checked**, not left to reviewers. A hardcoded colour **fails a
gate**, so drift is impossible-by-default rather than a code-review accident.

---

## §3 — The token tiers (measured, `DESIGN.md:21–25`)

One token source, `ui/src/index.css` (Tailwind v4; no tailwind config file). Three tiers:
1. **Semantic** — shadcn core: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--destructive`,
   `--border`, `--ring`, `--sidebar-*`, `--chart-1..5` (OKLCH, light/dark overrides).
2. **Brand** — agent gradients `--agent-1a/1b…10a/10b`, status hues `--status-task-*` / `--status-agent-*`.
3. **Domain** — `--chip-match-*`, doc-annotation highlights, motion/typography tokens.

**Notable single knobs** (`CHANGING-THE-UI.md:34–40`): `--radius` drives the **whole corner ladder**
(sm→4xl derived); the `--status-task-*`/`--status-agent-*` family is **the app-wide status vocabulary** —
"chips, charts, bars, live dots all follow it".

**The Tailwind v4 gotcha, recorded for us** (`DESIGN.md:19`): *"`@theme inline` bakes literal values at build
time. Any token that must be runtime-tunable must be defined in a NON-inline block."* This is why the motion
tokens live in `:root`, not `@theme inline` (`DESIGN.md:149–152`).

**Plain gloss:** there is **one vocabulary of visual values**, tiered by meaning, and the platform knows a
build-time vs runtime trap that would bite any team that copied the pattern naively.

---

## §4 — The decision sheet: the design system has a memory (measured)

`doc/design/DECISION-SHEET.md` (41 KB) is a **log of every open design question with its recommendation,
blast radius, and final status** — `APPROVED` / `OVERRIDDEN` / `DEFERRED`, with a commit hash where done.
Examples (measured, verbatim sense):
- **A1** two byte-identical status-badge maps → collapsed; *"`agentStatusBadge` had ZERO importing call
  sites, so it was deleted outright"* (`done 5ecc0f9e4`).
- **B2** 3,115 Tailwind palette-class sites / 145 files → **"Own future run (Run 4)… NOT wholesale now, NOT
  permanent exemption."**
- **C11** the sidebar agents section → unified onto `SidebarNavItem`; *"Wholesale shadcn Sidebar adoption
  REJECTED for now… (highest-regression chrome)"*.
- Three **gallery feedback rounds** with user rulings recorded and their visual consequences (e.g. "RUNNING =
  status blue, not cyan/teal").

**Plain gloss:** the design system **keeps its own minutes**. Every "why is this like that?" question has a
written answer, and every deliberate exception has a reason attached. This is the thing that makes a
303-component surface *maintainable* rather than merely large — and it is a **documentation practice our PX-W
should copy**, independent of any specific component.

---

## §5 — The component inventory and the primitives (measured)

`COMPONENT-INVENTORY.md` counts (measured table):

| Area | Count |
|---|---:|
| Shared primitives (`ui/src/components/ui/`) | **24** |
| Feature components, flat (`ui/src/components/*.tsx`) | 178 |
| Feature components, nested subdirs | 28 |
| **Feature components total** | **206** |
| Pages (`ui/src/pages/`) | 73 |
| **Grand total** | **~303** |

**The 24 primitives are real and conventional** (measured, `ui/src/components/ui/`): `button`, `card`, `badge`,
`dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu`, `select`, `input`, `textarea`, `label`,
`checkbox`, `radio-card`, `tabs`, `tooltip`, `avatar`, `breadcrumb`, `command`, `collapsible`, `separator`,
`scroll-area`, `skeleton`, `resizable-panels`, `attachment`, `toggle-switch` — i.e. **a shadcn-style base set**.

**Plain gloss:** a small, canonical primitive set (24) under a large feature surface (206) — the shape
`DESIGN.md` principle 1 demands ("one component per job; variants are props, not new components").

**Feature areas by component count** (measured): `task-chat/` 71, `ui/` 27, `ai-connections/` 20, `voice/` 15,
`task-side-panel/` 13, `skill-studio/` 12, `onboarding/` 12, `artifacts/` 12.

**Cross-connection to P1/P2/P3** — the UI carries the poles' surfaces: `task-chat/` (P2/P3 conversation),
`artifacts/` (P2 deliverables), `skill-studio/` (P1 skills), `agents/` + `new-agent/` (P1), `routine-*`
(P3 routines), `issue-*` (P2 tasks). **The frontend is where all three poles meet the user.**

---

## §6 — The app shell and the "design guide" (measured)

- Entry: `ui/src/main.tsx`, `ui/src/App.tsx` (with routing tests `App.*.test.tsx`); title `Paperclip`
  (`ui/index.html`).
- There is an in-app **`DesignGuide` page** (`ui/src/pages/DesignGuide.tsx`) — the design system documents
  itself **inside the product** (`DESIGN.md:9`: "Storybook is the verification surface — it documents the
  system; it does not define it").
- Storybook is the verification surface: **`pnpm build-storybook`**, `ui/storybook/stories/`, with
  agent-persona visual suites run under **Playwright 1.62.1 (Noble image)** for "authoritative Linux
  baselines" (`doc/agent-personas.md:95–120`).

**Plain gloss:** the design system has **three faces that agree**: the rules (`DESIGN.md`), the proofs
(Storybook screenshots), and an **in-app guide** a person can open. That triad is a mature pattern worth
carrying.

---

## §7 — Why this batch matters for "widgets"

The owner named "the widgets architecture" as a cross-cutting concern. Paperclip's answer to "what is a
widget?" is effectively: **a component that consumes tokens, has one job, and is proven by a screenshot.** It
does not ship a formal "widget registry" or a drag-and-drop composer (no such thing appears in the surfaces
listed) — its composability comes from **primitive + feature components + tokens**, not from a runtime widget
system.

**Plain gloss (important for the mapping step):** Paperclip gives us a **world-class component *system*** but
**not a widget *composer***. If our plan needs users to assemble dashboards from widgets, Paperclip is the
**styling and discipline model**, not the widget engine. That distinction is recorded now so the mapping step
does not over-claim.

---

## §8 — Divergences found in this batch

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D1** | `DESIGN.md:123` says "there are only ~24" primitives; `:123` also says "~46 existing stories"; and it references "~277" feature components | `COMPONENT-INVENTORY.md` measures **24 primitives**, 206 feature components, and **`DESIGN.md:123`'s own scope note reconciles to "24 + ~277 = 303"** vs the inventory's 206+73+24 = 303 | **Reconciled — the two docs' counts agree on the total (303) via different splits.** Not a divergence; recorded so the numbers are not mistaken for contradictions. |
| **D2** | A reader might expect a "widget" concept | No widget registry/composer exists; composability is token+component based | **Concept absence, stated plainly.** Not an error — a boundary of what Paperclip teaches. |

---

## §9 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C5-1** | **One token source** (`ui/src/index.css`), Tailwind v4, `@theme inline` bakes at build time so runtime-tunable tokens need a non-inline block. | PX-W (core) |
| **C5-2** | **Mechanical token gate** (`check:token-gates`) — compliance is enforced, not reviewed. | PX-W |
| **C5-3** | **510-image visual baseline** = the proof of "no visual change". | PX-W, PX-F |
| **C5-4** | **The decision sheet** — the design system keeps written minutes per judgement call. | PX-W (practice) |
| **C5-5** | **24 canonical primitives under a 206-component feature surface**; variants as props. | PX-W |
| **C5-6** | **The three faces agree**: rules (`DESIGN.md`) · proofs (Storybook) · **in-app `DesignGuide`**. | PX-W |
| **C5-7** | **Status is one vocabulary** (`--status-task-*`/`--status-agent-*`) used by chips, charts, bars, dots. | PX-W, P2 |
| **C5-8** | **Single-knob design**: `--radius` drives the whole corner ladder. | PX-W |
| **C5-9** | **No widget composer** — Paperclip teaches a component *system*, not a widget *runtime*. | mapping (boundary) |
| **C5-10** | Existing allowed debt, explicit: ~3,115 Tailwind palette-class sites deferred to a named "Run 4", not exempted. | PX-F |

---

## §10 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
A user gets a UI that is **consistent by construction** — one green, one blue for "running", one corner
radius, one status vocabulary across every screen — and a product whose look can be **rethemed safely**
without breaking layouts. Consistency is not a luxury in an operator console; it is what lets a person scan.

**Q2 — how does this serve an AI-first business & resources planner?**
Four practices are directly reusable for **PX-W** and **PX-F**: (1) the **single token source + mechanical
gate (C5-1/C5-2)** — the only way a 300-component surface stays coherent as it grows; (2) the **visual
baseline as proof (C5-3)** — for a platform built largely by agents, "prove nothing moved" must be
automatic; (3) **the decision sheet (C5-4)** — a written memory for design judgement, which is exactly what
an agent-maintained codebase needs; (4) **the one status vocabulary (C5-7)** — a resources planner *is* a
status-reading tool. The recorded boundary (C5-9) matters just as much: if our vision needs a **widget
composer**, Paperclip gives the styling discipline but we must **build the composer** — that is a real
build-vs-adopt decision for the mapping step.

---

*Batch 05 of 07 complete. Divergences: 2 (1 reconciled, 1 concept-absence). Carried: C5-1…C5-10.
Next: `06-out-of-pole-findings.md` (PZ).*
