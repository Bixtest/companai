# Batch 05 — Widgets and Frontend (PX-W / PX-F)

**Study:** Multica `0.2.0` · **Batch:** 05 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

Two cross-cutting questions. **PX-F (frontend wiring)** is how the surface is built and shared across
platforms; **PX-W (widgets)** is the composable UI surface.

Short answer, measured:

| Question | Multica's answer | Where |
|---|---|---|
| How is the frontend split? | Three shared packages + three apps, with a **strict dependency direction** (`views → core + ui`; core and ui independent) | F05-01 |
| How do web, desktop and mobile share code? | **Platform adapters** — `NavigationAdapter`, `StorageAdapter`, `useNavigation`, `<AppLink>` | F05-02 |
| How is visual consistency kept? | A **design-token system** with a role-named type scale and WCAG-pinned colors | F05-03 |
| How are components kept consistent? | **Written component contracts** (`packages/ui/docs/`) that also power a live workbench | F05-04/05 |
| **Is there a widget/composer model?** | **No.** Measured: zero composer, and "widget" appears in 13 code files, all incidental | F05-06 |
| How is state divided? | TanStack Query owns server data; Zustand owns client state; **only auth/workspace stores may call the API** | F05-07 |

---

## 1. The shape, measured

| Surface | Files (`.ts`/`.tsx`) | Lines | What it is |
|---|---:|---:|---|
| `packages/views` | 1,192 | 304,348 | **the shared pages** (the largest frontend surface by far) |
| `packages/core` | 511 | 86,914 | headless logic: API client, query hooks, shared stores |
| `apps/mobile` | 303 | 35,496 | Expo / React Native client (**independent**) |
| `apps/web` | 165 | 29,196 | Next.js 16 routes/layouts |
| `apps/desktop` | 153 | 24,676 | Electron app |
| `packages/ui` | 79 | 10,689 | UI primitives + tokens (**46 primitives** in `components/ui/`) |
| `apps/ui-lab` | 33 | 5,949 | the component workbench |

**The finding is the ratio.** The *shared* layer (`views` + `core` + `ui` = 1,782 files / ~402k lines) is
roughly **five times** the app layers that consume it (~60k lines). Multica built a product where almost
all of the frontend is shared and the per-platform code is thin — which is the whole point of §2–§3.

*(A measurement note: a first pass with `xargs wc -l` returned nonsense — `apps/mobile` reported 303 files
and 181 lines — because the argument list was split. The table above is from a second, independent count
that walks the tree in Python. The discrepancy is recorded because rule 2 says measure, and because a
wrong line count is exactly the kind of number that quietly poisons a finding.)*

---

## 2. The package boundaries — a layering with named constraints

`AGENTS.md:11-24` is a table of responsibilities, and it is unusually specific. Each row states not only
what a package *is* but what it **may not** do:

| Location | Responsibility and constraints |
|---|---|
| `packages/core/` | *"Headless logic, API client, Query hooks, shared Zustand stores. **No UI libraries, `react-dom`, `localStorage`, or `process.env`**; use `StorageAdapter` for persistence."* |
| `packages/ui/` | *"UI primitives and shared styles. **No business logic or `@multica/core` imports.**"* |
| `packages/views/` | *"Shared web/desktop pages and business components. **No store definitions, `next/*`, or `react-router-dom`**; use `NavigationAdapter`, `useNavigation()`, and `<AppLink>`."* |
| `apps/web/` | *"Next.js routes/layouts and web-only UI. Framework APIs stay here."* |
| `apps/desktop/` | *"Electron and desktop-only UI/state."* |
| `apps/mobile/` | *"Independent Expo/React Native client: owns UI, state, hooks, providers, i18n, build, and release."* |

And the one line that makes it enforceable (`AGENTS.md:22`): *"Dependency direction is `views → core +
ui`; core and ui remain independent."*

**Plainly:** `core` cannot know about a browser (no `localStorage`, no `process.env`), `ui` cannot know
about the business, and `views` cannot know which framework renders it. Each constraint is a **seam
waiting to be filled by an adapter** — which is exactly §3.

---

## 3. The platform-adapter seam

The constraints in §2 are only possible because the platform-specific parts are named and injected:

- **`StorageAdapter`** — `core` persists through it instead of `localStorage`, so the same store works on
  web, in Electron, and (in its own client) on mobile.
- **`NavigationAdapter` / `useNavigation()` / `<AppLink>`** — `views` navigates through these instead of
  `next/*` or `react-router-dom`, so one page component works under Next.js and under the desktop router.
- **`WindowOverlay`** (`AGENTS.md:89`) — desktop's pre-workspace one-shot flows (create workspace, accept
  invite) are **window overlays, not routes**, so they do not pollute the tab model.
- **`setCurrentWorkspace(slug, uuid)`** (`AGENTS.md:90`) — desktop route layouts own the workspace
  identity; the adapter is the only thing that knows both the slug and the uuid.

**The finding:** the platform differences are collected into a handful of **named adapters**, and the
shared layer is written against those names. That is what lets ~400k lines of shared frontend run on three
platforms.

---

## 4. The design-token system — and the history in its comments

`packages/ui/styles/tokens.css` (315 lines) is the single source of visual truth, *"shared across Web +
Desktop"* (`tokens.css:1`). Three parts:

### 4.1 A role-named type scale

`tokens.css:67-122` declares **ten** text steps — `micro` (11), `caption` (12), `label` (13), `body` (14),
`body-lg` (15), `title-sm` (16), `title` (18), `title-lg` (20), `display-sm` (24), `display` (36) — each
with its own line-height. The comment above it is a **measurement of the problem it fixed**:

> *"There was no `--text-*` token here before, so sizes grew ad hoc: **51 distinct font sizes across web +
> desktop, 370 of them written as arbitrary values, including half-pixel steps (10.5 / 11.5 / 12.5 / 13.5
> / 14.5 / 15.5px) that nobody chose deliberately** — they appeared because there was no step to reach
> for."*

And the rule that keeps it from drifting: *"The steps are named for the role the text plays, not for a
t-shirt size … 'what is this text for' has an answer a reader can check, 'is this sm or base' does not."*
Six of the ten steps **deliberately keep Tailwind's exact size/line-height pairs** so switching to them
moves nothing on screen — a migration that costs no visual change.

### 4.2 A surface system

`tokens.css:146-175` names the layers: `--app-shell` (the quiet outer frame), `--page-canvas` (where lists
and conversations live), `--surface` (bounded content groups), `--surface-raised` (ephemeral overlays), and
`--surface-selected`. Two shadow tokens separate *menus* (lighter, they hover above a trigger) from
*windows* (dials/sheets).

### 4.3 Colors pinned by contrast, not taste

Two comments state a WCAG constraint as the reason for a value:

- `--muted-foreground` (`tokens.css:187-194`): *"Lightness is pinned by WCAG AA, not by taste … At the old
  0.552 that pair was 3.98:1; 0.505 clears 4.5:1 on all of app-shell / page-canvas / sidebar /
  sidebar-accent / muted / surface-selected / surface, with the worst case at 4.88:1. Raise it and the nav
  labels fail again."*
- `--faint-foreground` (`tokens.css:195-206`): a step *"below muted, for marks that are not text"*,
  created because the alternative people reached for was alpha — *"152 call sites of
  `text-muted-foreground/30..80` — and alpha on light surfaces lands between 1.5:1 and 3.8:1, which fails
  even the 3:1 floor for non-text."* It is explicitly **not valid for text**, and the comment says why
  there is no third text step (AA caps it 0.018 L away from muted — *"a difference no one can see"*).

**The finding:** the token file is not a palette; it is a **set of decisions with their measurements
attached**, including the two failure modes (half-pixel sizes; alpha for quiet marks) that created it.

---

## 5. Component contracts — documentation that is also a tool

`packages/ui/docs/` holds `button.md` (47 lines) and `dialog.md` (57 lines), each in **two languages**
(`.md` and `.zh.md`). They are not API dumps; they are **contracts with a "Correct" and an "Avoid"
section**. `button.md` states the rule (*"Use Button for actions. Use a navigation link for destinations.
Keep one dominant action per dialog or form."*), a variant table, and then the failure it prevents:

```tsx
// Avoid
<Button variant="primary" loading>Save</Button>
<Button className="h-6 bg-blue-500 px-2">Save</Button>
```
> *"`primary` and `loading` are not supported props. Choose a supported size and semantic variant before
> overriding geometry or colors."*

And `AGENTS.md:104` ties the contract to a tool: *"These component contracts also power UI Lab
documentation."*

---

## 6. UI Lab — the design-system workbench

`apps/ui-lab` (33 files / 5,949 lines) is a Vite app that renders the design system for inspection. It is
not a storybook clone; it carries **real tooling**:

- `color.ts` / `contrast.ts` use `colorjs.io` to convert between hex and OKLCH and to **compute contrast
  against a composited background stack** (`resolveBackground` composites the layered surfaces and
  *"throws when the canvas is not opaque"*).
- `color-editor.tsx` / `color-usage.tsx` — edit a token and see where it is used.
- `component-rules.tsx` — the rules from §5, rendered.
- `contrast.test.ts`, `colors-scene.test.ts`, `catalog.test.ts` — the workbench is **tested**.

`button.md` states the boundary precisely: *"UI Lab exports a CSS patch for
`packages/ui/styles/tokens.css`. Review the original and edited previews in both themes, merge declarations
into the matching blocks, then review the source diff. **Saving a browser design does not apply it to
product code.**"* The workbench proposes; the token file and a reviewed diff decide.

---

## 7. State and API boundaries

`AGENTS.md:50-62` (State Rules) and `:63-70` (API Compatibility) draw the frontend's data boundaries:

- **TanStack Query owns server data; Zustand owns client state** (filters, drafts, modals, tab layout) —
  *"persist only durable preferences/drafts/layout, not server data or ephemeral UI state."*
- **Only auth/workspace stores may call `api.*` directly**; *"other server interactions belong in
  queries/mutations."*
- **WebSocket events patch or invalidate Query caches, not Zustand payloads.**
- **Optimistic patches have four conditions** — *"a predictable result, rare failure, trivial rollback,
  and staying on the current screen"* — plus snapshot/rollback rules.
- **Create/delete/leave flows await the server** before navigating; *"do not optimistically delete
  entities."*
- **Installed desktop clients may talk to newer backends**, so UI-consumed JSON *"passes through a zod
  schema and `parseWithFallback`, not an `as T` cast"* (`AGENTS.md:67`), and unknown server enums get
  fallbacks.

**The last rule is the interesting one for PX-F:** an installed desktop app is a *deployed client* that
cannot be force-upgraded, so the API boundary is treated as **untrusted in both directions** — the client
validates what it receives rather than casting it.

---

## 8. The widget model — measured absent

The PIN asked whether Multica has "the widget model". Measured: **it does not.**

- A full-tree search for `widget` across `.ts`/`.tsx`/`.go`/`.sql` finds **13 files**, and every one is
  incidental — an `autosize-textarea.tsx`, a few tests, a PR-list component using the word in a comment.
  There is **no `Widget` type, no widget registry, no composer**.
- A search for any composer (`widgetComposer`, `block composer`, `widget-composer`) returns **nothing**.

**So the answer to PX-W is a negative, and it is a finding, not a gap in this batch.** Multica's UI is
composed of **pages and business components** in `packages/views` (1,192 files), assembled into fixed
screens — not of user-arrangeable widgets. It has the *pieces* a widget system would need (46 primitives,
a token system, adapters, contracts) but it never builds the composition layer on top.

**This is the second platform in the study with no widget architecture** (Paperclip had none either).
Recorded here as the PX-W verdict; the cross-platform comparison is batch 07's job (rule 5).

---

## 9. The retirement ledger (rule 10)

| Migration | What was removed | Why |
|---|---|---|
| `144` / `256` | the v1 and v2 chat-pending markers | superseded (recorded in batch 04 — the *frontend* concept behind them, "chat is waiting on a task", was rebuilt twice) |

The frontend has no migration history of its own (it is not in the database). Its "retirements" are
visible only as the *shape* it converged to — most clearly in the token file's own account of the 51
ad-hoc sizes it replaced (§4.1). **That comment is this batch's retirement entry**: it records a design
that was removed and why.

---

## 10. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F05-01** | **A strict three-package layering** with named *prohibitions* (`views → core + ui`; core and ui independent; no `localStorage`, no `next/*`, no stores in views). | PX-F | One consistent product across web and desktop. | A frontend that can be re-hosted on a new platform without rewriting the pages. |
| **F05-02** | **Platform adapters** — `NavigationAdapter`, `StorageAdapter`, `useNavigation`, `<AppLink>`, `WindowOverlay`. | PX-F | The same feature behaves natively everywhere. | Platform differences are collected into named seams, not spread through the code. |
| **F05-03** | **A role-named design-token system**, with the type scale's history (51 sizes → 10 role-named steps) and colors pinned by WCAG measurement. | PX-W / PX-F | The UI looks deliberate and stays readable. | A reusable visual language with its rules written down. |
| **F05-04** | **Component contracts** (`packages/ui/docs/*.md`) with "Correct"/"Avoid" sections, in two languages. | PX-W | Components are used the way they were designed. | Documentation a newcomer (or an agent) can be held to. |
| **F05-05** | **UI Lab** — a tested workbench with real OKLCH/contrast tooling that *proposes* token changes for review, never applies them. | PX-W | Colors and components can be inspected and proven accessible. | A design system with its own verification, and a human review gate. |
| **F05-06** | **No widget model** — measured absent (0 composers; 13 incidental mentions). | PX-W | (n/a) | A clear negative: the composition layer is not borrowed from here. |
| **F05-07** | **State/API boundaries** — Query owns server data, Zustand owns client state, only auth/workspace stores call the API, optimistic updates have four conditions. | PX-F | The UI does not show stale or invented data. | Predictable data flow; the server stays the source of truth. |
| **F05-08** | **The deployed-client rule** — UI JSON passes through zod + `parseWithFallback`, never an `as T` cast, because installed desktop clients may talk to newer backends. | PX-F | An older app keeps working against a newer server. | Compatibility is enforced at the boundary, not hoped for. |
| **F05-09** | **The shared:app ratio** — ~402k shared lines vs ~60k app lines (≈5:1). | PX-F | (indirect) — one product, three platforms. | The frontend investment is in the shared layer. |

---

## 11. Divergences and honest bounds

- **No doc-vs-code divergence was needed.** The frontend's "documents" are `AGENTS.md` (the rules) and
  `packages/ui/docs/` (the contracts), and both match the code.
- **Bound:** this batch read the **architecture and the conventions**, not the rendering of individual
  screens. The issue board, the chat surface and the editor are named as living in `packages/views` but
  were not read screen by screen — that is a depth call, not an omission.
- **Bound:** the mobile app has its own `AGENTS.md` (`apps/mobile/AGENTS.md`) and its own rules; this batch
  read the root file and the boundary table, and states that mobile is an **independent client** rather
  than claiming to have read its internals.
- **Bound (stated plainly):** the "no widget model" verdict (§8) is a *negative* claim. It rests on a
  full-tree search for the term and for any composer. A widget system under an unexpected name would not
  be caught by that search; the honest phrasing is *"no widget or composer model exists under any name this
  batch searched for."*

---

## 12. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The package-boundary + adapter pattern (F05-01 / F05-02)** — a strict layering whose constraints are
   *prohibitions*, with the platform differences collected into named adapters. It is the cleanest
   multi-platform frontend seam in the study.
2. **The token system with its history attached (F05-03)** — a role-named scale, and comments that record
   the 51 ad-hoc sizes and the WCAG measurements behind each pinned color.
3. **The negative on widgets (F05-06)** — the composition layer is not available here; if the vision wants
   a widget surface, it is **not** borrowed from Multica.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 05 of 07. Read from source on 2026-10-15. Next: `findings/06-out-of-pole.md`.*
