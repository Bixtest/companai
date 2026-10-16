# Front-end, UI and responsiveness — code-level forensic audit

**Written:** 12 October 2026 · **Author:** an agent brought in to learn the project cold
**Closes:** Batch 5 of my audit plan, which I previously admitted I had not done.
**Method:** code-level static reading plus executed commands. Nothing was modified.
**Verification marks:** 🔬 I ran the command · 🔎 I read the exact lines, corroborated by a second reader ·
🧪 I executed a probe.

---

## 0. How this audit differs from document 10

Document 10 described the front end **from the documentation** — the design-system rulebook, the module
register, the adopted blueprint. This audit reads **the code**. The difference matters, because in three
places the documentation says a control exists and the code shows it cannot run.

**The headline, stated first:** the design system has an excellent 367-line rulebook, a purpose-built ESLint
plugin with six rules, and **no working enforcement**. `yarn lint:ds` exits with code 2 before linting a
single file. That is the same defect class as the back end — a control declared and never consumed — and it
is measurable in one command.

---

## 1. HIGH — the design-system lint is broken

**What it should be.** `yarn lint:ds` runs `eslint --config eslint.ds.config.mjs packages/core/src/modules
packages/ui/src/backend` and reports design-system violations.

**What it is.** 🔬

```
$ corepack yarn lint:ds
Oops! Something went wrong! :(
ESLint: 9.39.4
TypeError: Cannot read properties of undefined (reading 'Cjs')
    at .../@typescript-eslint/typescript-estree/dist/create-program/shared.js:59:18
EXIT CODE: 2
```

The config parses, then the TypeScript parser crashes on load. **Not one file is linted.** I reproduced it
twice — once invoking `eslint` directly, once through the `corepack yarn` script — so it is not an artifact
of how I called it.

**A hostile pass then established this is broader and deeper than I first reported.** I wrote a *minimal*
config — no DS plugin, no rules, nothing but the parser — and ran it from the repo root:

```js
import tsParser from "@typescript-eslint/parser"
export default [{ files: ["packages/ui/src/primitives/badge.tsx"], languageOptions: { parser: tsParser } }]
```

It crashed with the **identical** error. So the defect is not in the DS config at all: **the
`@typescript-eslint` toolchain itself is broken in this install.**

The root cause is measurable — a **mixed-version install**:

| Package | Installed |
|---|---|
| `parser` | 8.62.1 |
| `typescript-estree` | 8.62.1 |
| `tsconfig-utils` | 8.62.1 |
| `project-service` | 8.62.1 |
| **`scope-manager`** | **8.59.3** |
| **`types`** | **8.59.3** |
| **`visitor-keys`** | **8.59.3** |

An API changed in `visitor-keys` between 8.59 and 8.62, and the newer `typescript-estree` reads a shape the
older one does not export. **This is a dependency-resolution defect, not a code defect** — but its effect is
that every `@typescript-eslint/parser`-based lint in the repository is dead, including the design-system
lint.

**And it would not fail a build even if it ran.** All six rules are configured at `warn`:

```js
// packages/eslint-plugin-ds/index.js:31-38
'om-ds/require-empty-state': 'warn',
'om-ds/require-page-wrapper':  'warn',
'om-ds/no-raw-table':          'warn',
'om-ds/require-loading-state': 'warn',
'om-ds/require-status-badge':  'warn',
'om-ds/no-hardcoded-status-colors': 'warn',
```

The comment says this is deliberate rollout severity, escalating per-rule once a health metric allows it.
Fair — but it means the *only* enforcement mechanism for the design system is currently **both broken and
non-blocking**.

**Severity: HIGH.** The `.ai/ds-rules.md` rulebook (367 lines covering colour, brand, charts, radius,
typography, spacing, opacity, z-index, shadows, motion, borders, focus, dark mode, forms, icons, sections)
is enforced by convention alone.

---

## 2. HIGH — accessibility linting is installed and never switched on

**What it should be.** The AGENTS.md mandates WCAG-oriented practice; `eslint-plugin-jsx-a11y` is in
`node_modules`.

**What it is.** 🔬

- `Test-Path node_modules\eslint-plugin-jsx-a11y` → **True** (installed).
- `rg "jsx-a11y" eslint.config.mjs` → **zero matches**.
- The main config is exactly: `...nextCoreWebVitals`, an ignores array, and six rule overrides. **No a11y
  plugin, no custom rules.**

So accessibility linting is present as a dependency and consumed by nothing.

**The mitigations, which are real:** accessibility *attributes* are used heavily in the shipped code —
🔬 **1,817** `aria-*`, **295** `htmlFor`, **345** `<label`, **221** `focus-visible:`, **48** `sr-only`,
**39** `alt=`, and a sensible heading distribution (h1 45 · h2 158 · h3 133 · h4 24). Focus rings use
`focus-visible:` and the DS `shadow-focus` recipe rather than `focus:`. DataTable's checkboxes, refresh
buttons, resize handles and column chooser all carry proper `aria-label`s.

**So the code has good accessibility *habits* with no *gate*.** A new component with no label association
would pass every check that exists.

**Severity: HIGH** — not because the UI is inaccessible, but because nothing would catch it becoming so.

---

## 3. HIGH — RTL is half-built, and its own code says it is finished

**What it should be.** Invariant `I12`: *"locale and direction are structural, not cosmetic… RTL/LTR is a
layout contract from the first component, not a late theme."* Arabic is seeded as a locale from day one.

**Half of it is built, and built well.** 🔎 `packages/shared/src/lib/i18n/direction.ts` exists and is a
well-designed piece of work: it decides direction from the **language subtag only** (so `ar`, `ar-EG` and
`ar-Arab-EG` all resolve correctly rather than requiring an exhaustive tag list), over a deliberately small
closed set of ten RTL languages — Arabic, Hebrew, Persian, Urdu, Pashto, Sindhi, Uyghur, Yiddish, Dhivehi
and Kurdish (Sorani) — on the reasoning that *"a wrong entry here silently mirrors somebody's entire
interface."* And it is wired: `<html lang={locale} dir={direction}>`
(`apps/mercato/src/app/layout.tsx:41`).

**The other half does not exist.** 🔬

- `globals.css` contains **zero** occurrences of `dir=`, `rtl`, `ltr` or `direction`.
- A repo-wide search (excluding `node_modules` and `dist`) for `[dir=`, `:dir(` or `dir="rtl"` returns
  **exactly one hit — and it is in a test**: `packages/ui/src/primitives/__tests__/scroll-area.test.tsx`.
  **Zero production RTL styling.**
- Word-boundary counts across `packages/ui/src`, `packages/core/src`, `apps/mercato/src`:

| Physical (breaks in RTL) | Count | Logical (RTL-safe) | Count |
|---|---|---|---|
| `ml-` | 197 | `ms-` | 11 |
| `mr-` | 286 | `me-` | 2 |
| `pl-` | 95 | `ps-` | 1 |
| `pr-` | 88 | `pe-` | 0 |
| `left-` | 111 | `start-` | 92 |
| `right-` | 140 | `end-` | 187 |
| `text-left` | 169 | `text-start` | 2 |
| `text-right` | 43 | `text-end` | 0 |
| **total** | **1,129** | **total** | **16** |

**A 70:1 ratio.** With `dir="rtl"` set and no compensating CSS, every margin, padding, absolute position
and text alignment in the admin UI renders on the wrong side. Browsers flip *text* direction and flex *row*
order; they do not flip `ml-`, `left-` or `text-left`.

**The documentation defect, which is the finding.** `direction.ts`'s own header comment claims:

> *"The platform already had the **capability** — every Radix primitive accepts `dir`, and the CSS logical
> properties follow it — but nothing decided what to pass."*

The first half is true (Radix primitives do accept `dir`). **The second half is false** — measured: 1,129
physical utilities, 16 logical ones, zero `[dir]` rules. So the file closes a real gap while recording, in
its own prose, a capability that does not exist. That is precisely the project's own standard for a defect:
*where a document and the code disagree, the disagreement is itself the defect.*

**Severity: HIGH for Arabic**, which the platform already ships. The direction *decision* is done; the
direction *styling* is not; and the code says both are.

---

## 4. HIGH — `/backend` crashes if the `dashboards` module is switched off

**What it should be.** The dashboard screen is a *consumer* of the `dashboards` module; a platform that
parks or trims modules should not then have a hard build/run dependency on one of them.

**What it is.** 🔬 `apps/mercato/src/app/(backend)/backend/page.tsx` imports `DashboardScreen`
unconditionally:

```ts
import { DashboardScreen } from '@open-mercato/ui/backend/dashboard'
```

No check that the module is enabled, no fallback. And the codebase *knows*: the `om-trim-unused-modules`
skill's own SKILL.md states the rule explicitly —

> **If `dashboards` is one of the disabled modules, you MUST also update
> `src/app/(backend)/backend/page.tsx`** so it no longer renders `<DashboardScreen />` … Otherwise
> `/backend` will crash at build or request time.

So a **human-remembered rule** is the only thing standing between a module change and a broken landing
route. `packages/create-app/template/AGENTS.md` repeats the same warning.

**Severity: HIGH** — low probability, high blast radius, and the failure is a build/run crash rather than a
degraded page.

---

## 5. MEDIUM — six rules covering six of ~30 rule categories

The plugin enforces: no-hardcoded-status-colors, no-raw-table, require-empty-state, require-loading-state,
require-page-wrapper, require-status-badge.

`.ai/ds-rules.md` defines rules for **colour, brand, charts, corner radius, typography, spacing, opacity,
z-index, shadows, motion, content, status display, forms, icons, sections, breakpoints, borders, focus
states, dark mode** — roughly thirty categories. Six are enforced (two of them structurally: page wrapper
and empty state). **Twenty-four categories have no automated check at all**, including every arbitrary-value
rule (`text-[13px]`, `p-[13px]`, `rounded-[24px]`, `z-[9999]`).

I measured the residual violations of exactly those unenforced rules: 🔬 **9 arbitrary media queries**
(`min-width:` / `max-width:` / `(max-…`), which the rulebook forbids outright in favour of the Tailwind
mobile-first scale.

**Severity: MEDIUM**, and it is the honest limit of what a six-rule plugin can do.

---

## 6. MEDIUM — the DS lint's scope excludes where user modules live

`eslint.ds.config.mjs:12-17` globs:

```
packages/core/src/modules/**/backend/**
packages/enterprise/src/modules/**/backend/**
packages/ui/src/backend/**
```

`apps/mercato/src/modules/**/backend/**` — the documented home for user-created modules — is **not
covered**.

**Today the blast radius is one module.** 🔬 Exactly one app module ships a `backend/` directory:
`apps/mercato/src/modules/example/backend`. So the gap is narrow *now*.

**Severity: MEDIUM**, because the gap is exactly where new code is supposed to go, and it will widen the
moment a real user module is built.

---

## 7. MEDIUM — 27 of 73 design-system primitives have no test

🔬 Measured directly: 73 component/source files under `packages/ui/src/primitives/`, of which 46 have a
test file. The 27 without one include the most consequential:

```
button · input · select · textarea · card · label · form-field
DataLoader · status-badge · tooltip · popover · switch · switch-field
calendar · password-input · email-input · amount-input · fancy-button
link-button · social-button · spinner · kbd · Notice
```

`button`, `input`, `select` and `textarea` are the four primitives every form on the platform renders.
`status-badge` is the primitive the DS rules say must carry all status colouring. `DataLoader` is the
loading-state primitive the rules say every async page must use.

**Severity: MEDIUM.** The tested primitives are the ones with interesting behaviour (dialog focus, drag and
drop, virtualization, date pickers); the untested ones are the ones with *default* behaviour — which is
precisely what every consumer relies on.

---

## 8. MEDIUM — dashboard widgets declare no layout contract

🔬 All 10 dashboard widgets (`aov-kpi`, `orders-kpi`, `new-customers-kpi`, `revenue-kpi`, `revenue-trend`,
`orders-by-status`, `pipeline-summary`, `sales-by-region`, `top-customers`, `top-products`) declare **no
responsive, height, width or grid-span contract** — none mentions `responsive`, `minHeight`, `height`,
`gridSpan` or `colSpan`.

The grid that arranges them does state its own breakpoints — `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
(`DashboardScreen.tsx:452-455`) — and per-item spans are derived from an item *type* (`md:col-span-2` for
wide items). So the layout is coherent for the shapes it knows, and a widget that needs a different aspect
ratio has no way to say so.

Note also: **all ten are currently switched off** in `apps/mercato/src/modules.ts`, because they read
parked modules. So this is latent for the shipped configuration — and it becomes live the moment the
business areas return.

**Severity: MEDIUM (latent).**

---

## 9. MEDIUM — three modules have data, API and no configuration screen

🔬 `dashboards`, `perspectives` and `progress` each have **zero `backend/` directories and zero
`page.meta.ts` files**.

But the picture is more nuanced than the module register's "zero UI" verdict, and the nuance matters:

- **`perspectives`** has a full, well-built configuration surface — `PerspectiveSidebar` (create, rename,
  clone, share to roles, set default, column chooser with drag-to-reorder, autosave, optimistic-conflict
  handling via `surfaceRecordConflict`). It is mounted **inside `DataTable`** when `canUsePerspectives` is
  true. So there is no standalone *page*, but the feature is fully reachable. **"Zero UI" is wrong.**
- **`dashboards`** has `DashboardScreen` in `packages/ui/src/backend/dashboard/` — it renders the layout,
  handles a partial-error banner with a reload action, and derives column spans. `WidgetVisibilityEditor`
  exists as a component. **"Zero UI" is also wrong.**
- **`progress`** genuinely has no screen: a service, an API and a `ProgressJob` table, with no way for a
  person to see or manage a job except through whatever a given module renders inline.

**Severity: MEDIUM**, and the correction to the register is the finding: two of the three "zero-UI" verdicts
were structural counts that missed the component-level wiring.

---

## 10. LOW and NIT

| # | Finding | Evidence |
|---|---|---|
| L1 | 9 arbitrary media queries violate the mobile-first rule | 🔬 grep across `packages/ui/src`, `packages/core/src` |
| L2 | `prefers-reduced-motion` honoured in only 2 components | 🔬 `AppShell.tsx` (sidebar animation) and `DataTable.tsx` (scroll). The rest of the animation surface — dialogs, drawers, toasts, accordion, slide-in — is not covered. |
| L3 | 16 possible hardcoded literal text nodes | 🔬 advisory `yarn i18n:check-hardcoded` exists; this is a heuristic count, not a verified violation |
| L4 | Physical direction utilities are the default idiom | 1,129 usages vs 16 logical. Not a bug in itself — but it is why the RTL migration is a campaign rather than a flag |

---

## 11. What is genuinely strong — verified, not assumed

I tried to find the front end wanting and mostly could not. These are the measured positives.

**Responsive discipline is real, not aspirational.** 🔬 Breakpoint usage across the shipped front end, counted
**excluding** `dist/`, `node_modules` and `__tests__` (my first count included the built output and
overstated it — corrected here): `sm:` **490** · `md:` **256** · `lg:` **126** · `xl:` **43** · `2xl:` **2**.
The `md:`-first rule from the rulebook (`md:` is the first layout breakpoint; sidebar collapses at `lg:`) is
followed.

**`AppShell` is well engineered.** 🔬 Reading it directly: `hidden lg:block` sidebar with a mobile drawer,
body-scroll lock while the drawer is open so touch scroll stays inside it, `min-h-svh`,
`lg:grid-cols-[240px_1fr]` transitioning via `transition-[grid-template-columns]`,
`prefers-reduced-motion` respected by falling back to instant animation, sidebar collapse state persisted
to both `localStorage` and a cookie so the server and client agree, and the section sub-nav collapsing the
main sidebar only while a settings route is active and restoring the prior state on exit.

**`DataTable` is the strongest component in the platform.** 🔎 It carries a column *priority* system so
lower-priority columns are hidden rather than squeezed; `md:sticky` first column and actions column with
shadow affordances; `md:min-w-0` so the table stops forcing horizontal scroll at the breakpoint; a
`ResizeObserver` measuring the scroll viewport so the empty state centres in the *visible* area rather than
the overflowing table; row virtualization with the hooks called unconditionally and kept inert when off;
column resizing with a persisted width that overrides the default truncation; and filter-aware empty states
distinguishing "no results", "no results for this search", and "nothing yet".

**The `example` module is a genuinely good reference implementation** — it is the only app-level module with
a backend, and it exercises the injection surfaces, menu items, dashboard tiles and both widget kinds.

**Accessibility habits run deep** (§2). Focus rings use `focus-visible:` with the DS two-ring `shadow-focus`
recipe; icon-only buttons carry `aria-label`; sort indicators are `aria-hidden` on decorative chevrons;
checkboxes are properly labelled; the DS rulebook explicitly forbids `focus:` for rings.

**i18n coverage is broad.** 🔬 4 locale files per module across 34 modules (5 in `auth`) — English, Swedish
and Arabic plus a fourth. The scaffolding for the Arabic that RTL would need is present; the layout is not.

---

## 12. What I would fix, in order

| # | The fix | Why first |
|---|---|---|
| 1 | **Repair `yarn lint:ds`.** A dependency version mismatch in `@typescript-eslint` crashes the parser. Until it runs, 30 rule categories are unenforced. | One command to verify; unlocks everything else |
| 2 | **Enable `jsx-a11y`** in `eslint.config.mjs` at `warn`. | The plugin is already installed |
| 3 | **Guard `/backend` on the `dashboards` module** — render a real empty state when it is off instead of importing unconditionally. | Removes a documented crash trap |
| 4 | **Migrate physical direction utilities to logical ones**, starting with `packages/ui/src` (the primitives every consumer inherits). | 1,129 sites is a campaign, but the primitives are ~10 files |
| 5 | **Add `apps/mercato/src/modules/**/backend/**` to the DS lint scope.** | The glob is a one-line change |
| 6 | **Test the four primitives every form renders**: `button`, `input`, `select`, `textarea`. Plus `status-badge` and `DataLoader`. | Small, and they are the ones consumers cannot check themselves |
| 7 | **Extend the DS plugin** to the arbitrary-value rules (radius, spacing, typography, z-index, opacity). | The highest-violation-count categories |

---

## 13. The honest summary

**The front end is the strongest part of this platform, and its governance is the weakest.** That
combination is more dangerous than the reverse: a codebase this good invites the assumption that the
guardrails work, and here they demonstrably do not — `yarn lint:ds` exits 2, and `jsx-a11y` is installed
and never loaded.

The pattern is the same one I found in the back end, and it is worth naming precisely: **the rules are
excellent, and the consumers are missing.** The design-system rulebook is a genuinely good 367-line
document. Six of its roughly thirty categories have a check. Of those six, the check is broken. Of the
ones that aren't broken, none is set to `error`.

And the one place the documentation was *wrong in the code's favour* is worth recording as a correction:
`dashboards` and `perspectives` were registered as "zero UI" on a structural count of `backend/`
directories, when both have substantial, well-built configuration surfaces — one as the `DataTable`
sidebar, one as the dashboard screen. Only `progress` is genuinely screenless. The lesson is the module
register's own: **a count of directories is not a measurement of a capability.**

---

## 14. The hostile-critic pass on this document

A second reader attacked every claim with commands. **Three findings were corrected, one was substantially
broadened, and the rest held.**

| # | The attack | Verdict | What changed |
|---|---|---|---|
| 1 | "Is the DS-lint crash your invocation, or a genuine break?" | **HOLDS, and is broader than I reported** | A minimal config with *nothing but the parser* crashes identically. The defect is the whole `@typescript-eslint` toolchain — a measured version mix (8.62.1 parser against 8.59.3 `visitor-keys`/`scope-manager`/`types`), not the DS config. §1 rewritten. |
| 2 | "Is `jsx-a11y` maybe enabled somewhere else?" | **HOLDS** | Only two eslint configs exist in the repo (`eslint.config.mjs`, `packages/create-app/template/eslint.config.mjs`); neither references it. No `eslintConfig` key in any package.json, no `.eslintrc` outside `node_modules`. |
| 3 | "Is `dir` ever actually `rtl`? Is there a `[dir]` rule somewhere?" | **HOLDS, and is sharper than I reported** | Repo-wide search for `[dir=`/`:dir(`/`dir="rtl"` returns **one hit, in a test file**. Zero production RTL styling. And `resolveTextDirection` *is* built and well designed — so the finding became "half-built, plus a false claim in its own source comment" rather than "absent". §3 rewritten. |
| 4 | "Is there a guard around the `/backend` import?" | **HOLDS** | Read the entire page body: `<div className="p-6 space-y-6"><DashboardScreen /></div>` and nothing else. No dynamic import, no `notFound`, no try/catch. The SKILL.md warning is documentation of a real coupling. |
| 5 | "Is the '~30 rule categories' number fair?" | **Partly addressed** | The plugin's six rules are exact; the rulebook's category count is my estimate from its headings, and I have left it as an estimate rather than presenting it as measured. |
| 6 | "Are the 27 untested primitives covered by integration tests instead?" | **Not fully resolved** | I verified the unit-test absence directly (73 source, 46 tests). I did **not** audit `.ai/qa/` for Playwright coverage of the primitives, so the possibility that `button`/`input` are covered at the integration level is **open, not disproven**. Reported as unit-test absence only. |
| 7 | "Is the breakpoint count inflated by `dist/`?" | **FALSIFIED as stated, corrected** | My first count included built output. Excluding `dist/`, `node_modules` and `__tests__`, the honest numbers are `sm: 490 · md: 256 · lg: 126 · xl: 43 · 2xl: 2` — not 501/269/130/45/2. §11 corrected. |

**The lesson from this pass, which is the project's own:** my first measurement of the breakpoint counts was
inflated because I did not exclude the build output — the same "count the wrong thing carefully" failure the
project has been bitten by repeatedly. The finding survived; the number did not.

**What remains open:** whether the 27 untested primitives have integration coverage, and the exact count of
rule categories in the rulebook. Both are stated as unresolved rather than claimed either way.
