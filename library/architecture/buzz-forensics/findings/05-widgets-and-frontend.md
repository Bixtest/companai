# buzz — Batch 05: the composition surface and the frontend (PX-W / PX-F)

**Pole:** PX-W (widgets / composition) and PX-F (frontend).
**Source studied:** `buzz-main` @ v0.5.28, the extracted tree under
`platforms/_extracted/buzz-main/`.
**Method:** rule 0b / count FIRST, rule 1 / docs are claims, code is the
authority. Every number below was measured in this tree; every claim that comes
from a doc is labelled as a claim and then checked.

This batch answers two questions:

1. **PX-W** — does buzz have a widget or composer model? What is its composition
   surface, if any?
2. **PX-F** — what is its frontend architecture, and what does it teach?

The headline is already established from the batch-04 close and is *proven*, not
assumed, in §1: **buzz has no widget model and no composer.** It is the fifth
platform in this study with none.

The batch's *positive* contribution is unusual and is the reason it is worth
reading: buzz encodes two of its design and security rules as **executable CI
guards** — `check-px-text` and `check-pubkey-truncation` — each of which carries
a **stated root cause** (a regression that actually shipped) and a **narrow,
reason-annotated allowlist**. That is a different way of answering "how does the
frontend stay consistent?" than a component registry (n8n) or a linter plugin
(n8n's ESLint plugin). It is the guard-as-document pattern, and it is the thing
this batch recommends studying.

---

## 0. What I measured (rule 0b — counts first)

### 0.1 The polyglot footprint

The workspace is not one app. It is **four or five clients over one Rust core**,
and the line counts are wildly asymmetric:

| Surface | Files | Lines | Language(s) | Notes |
|---|---:|---:|---|---|
| `crates/` (Rust workspace) | — | — | Rust | the relay + core + workflow (batch 04 studied one crate) |
| `desktop/` | **3,424** | **656,805** | 724 `.tsx` / 181,514 · 1,220 `.ts` / 273,554 · 504 `.rs` / 201,517 | Tauri 2 + React 19 + Vite |
| — of which `desktop/src-tauri/src` | **478** `.rs` | **194,385** | Rust | the Tauri bridge only |
| `mobile/` | **904** | — | **695** `.dart` / 218,357, **zero** Rust | Flutter |
| `web/` | 66 | 4,719 | TS/TSX | a small read-only client |
| `admin-web/` | 17 | 2,721 | TS/TSX | a single-page admin console |
| workflow UI (inside desktop) | 57 product | 11,804 product + 2,645 test | TS/TSX | the P3 frontend from batch 04 |

Two of these counts carry real consequences:

- **Desktop is ~93% of the frontend line count** (656,805 of ~700k). The web and
  admin clients together are **7,440 lines** — about **1.1%** of desktop. This is
  a desktop-first product with two satellite thin clients, not a
  share-everything web stack.
- **`desktop/src-tauri/src` is 194,385 lines of Rust across 478 files — almost
  30% of all desktop lines.** The bridge is not a thin shim. It is a second
  application living inside the desktop app. Any "buzz desktop" claim that treats
  the Tauri layer as glue is wrong; §3 measures what is actually in it.
- **Mobile has ZERO Rust.** 218,357 lines of Dart over 695 files, with no shared
  core with desktop. This is the single most important PX-F divergence in the
  platform: the Rust crates are shared *everywhere except mobile*. Mobile is a
  full, independent re-implementation of the client logic in Dart.

### 0.2 The widget negative — proven, not assumed

A tree-wide search for `widget` outside Flutter/Dart returned **27 hits**, and all
27 are accounted for:

- **Flutter documentation and Dart API** — `Widget`, `HookConsumerWidget`,
  `ConsumerWidget` in `mobile/` are the Flutter framework's own word, not a
  product concept.
- **A handful of React component *nicknames* in comments** — e.g. a code comment
  reading "The `PubKey` widget" when the file defines a component. Prose, not a
  model.
- **`CREATE TABLE widgets` — which exists ONLY inside a `#[test]`.** The
  statement appears in
  `migration_lint_detects_tables_missing_community_id_by_default`, where it is
  *the example of a table that fails the lint* (a table with no `community_id`
  column). `grep -rn "CREATE TABLE widgets" migrations/` returns **nothing**. The
  only "widgets table" in buzz is a deliberate negative fixture.

So: no widget registry, no composer model, no element-type schema, no drag-target
composition surface. **buzz is the fifth platform in the study with no
widget/composer model** (Paperclip and Multica had none; Gas Town's frontend is a
CLI; and this one is the fifth). Rule 6: name the capability — the capability is
**absent**, and the absence is verified by searching for the *thing*, not for the
word.

### 0.3 What buzz has *instead* of a composer

The products it ships are surfaces, not compositions:

- **`desktop/src/features/` carries 31 feature directories** — `admin-console`,
  `agent-memory`, `agents`, `channel-templates`, `channels`, `chat`,
  `communities`, `community-members`, `custom-emoji`, `forum`, `gifs`, `home`,
  `huddle`, `identity-archive`, `local-archive`, `mesh-compute`, `messages`,
  `moderation`, `notifications`, `onboarding`, `presence`, `profile`, `projects`,
  `pulse`, `reminders`, `search`, `settings`, `sidebar`, `terminal`,
  `user-status`, `workflows`.
- **`desktop/src/app/` carries 82 files** — the shell, routing, overlays, and the
  community remount boundary.
- **`desktop/src/shared/ui/` carries 149 files**, of which **71 are `.tsx`
  primitives** — a shadcn/ui component library, vendored.

These are *fixed* features with *fixed* screens. There is no place where an
operator or an agent assembles a new surface out of parts. **The composition unit
in buzz is the event kind** (§1.4) — you extend the product by adding a `kind`
integer and a handler, not by composing widgets.

---

## 1. PX-W — the composition surface

### 1.1 The composition surface is a canvas, and the canvas is an event

buzz *does* have one thing that looks like a composition surface: **Channel
Canvas** (`kind:40100`). Each channel may hold a single shared canvas document
that any member with edit rights can edit.

The implementation is instructive precisely because it is **not** a widget model:

- `desktop/src-tauri/src/commands/canvas.rs` — `get_canvas` / `set_canvas` are
  Tauri commands that read and write **one event** for a channel.
- `desktop/src/shared/api/canvasTypes.ts` — the whole data model is
  `{ content, eventId, updatedAt, author }` plus a revision cursor. There is no
  element list, no component type, no layout tree.
- `desktop/src/features/channels/ui/ChannelCanvas.tsx` (270 lines) renders
  markdown and a textarea, with history.

The canvas is **a document with optimistic concurrency**, not a composition
model. `set_canvas` implements a genuinely careful two-stage concurrency check
(documented in its own comments):

1. **Pre-write precondition** — read the live head; if the caller's
   `expected_revision` no longer matches, return a frozen conflict marker. This
   catches the realistic stale-edit case.
2. **Post-write supersession check** — after the relay accepts the write, re-read
   the head once and confirm our event is the head (or reachable through its
   ancestry chain). If a stranger head won, return `CANVAS_SUPERSEDED` while
   *preserving our revision in history* — not losing it.

Two things about this are worth carrying forward:

- **A failed verification read is reported as `verified: false`, not as a failed
  save.** The comment states the rule explicitly: *"A failed verification read
  must never masquerade as a failed save; the caller reports success with
  `verified: false`."* The write was already accepted, so the honest report is
  "durable but unverified". This is the same discipline we saw in batch 04's
  `PartialProgress` — buzz repeatedly refuses to collapse two distinct outcomes
  into one boolean.
- **The residual race is named and deferred, not hidden.** The comments say the
  remaining window (a competitor landing after the post-write read) *"needs
  relay-side linearization (phase 2)."* A known limit, written down, with the fix
  named.

`canvas_write_created_at` is the *single home* for canvas timestamp discipline:
an accepted save stamps `created_at = max(now, head + 1)` so it sorts strictly
ahead of the head it read under `(created_at DESC, id ASC)`, and the helper
refuses a head timestamped far in the future. That is a **write-ordering
invariant enforced in one function**, which is the closest this platform comes to
a composition contract.

**Verdict for PX-W:** the canvas is a **composition-shaped surface with a
document model**, not a widget model. It composes *content* (markdown), not
*components*.

### 1.2 The design system is a vendored component library, not a registry

- `desktop/components.json` is **shadcn/ui config**: `"style": "new-york"`,
  `"baseColor": "zinc"`, `"cssVariables": true`, aliases into
  `@/shared/ui` and `@/shared/lib/cn`.
- `desktop/src/shared/ui/` holds **71 primitive `.tsx` files** plus supporting
  modules (`alert-dialog`, `button`, `dialog`, `dropdown-menu`, `popover`,
  `sheet`, `tabs`, `tooltip`, …) — the standard shadcn set, vendored into the
  repo.

Rule 6 — name the capability: there is **no component registry, no schema, and no
per-component contract file**. There is a *directory of components*. Contrast n8n
(batch 06 of that study), which enforces a 129-component design system with its
own ESLint plugin, and Multica, whose `packages/ui/docs/` contracts power a UI
Lab. buzz has neither: the components exist and are used, but nothing formalises
what a component *is* beyond being a `.tsx` file in `shared/ui`.

### 1.3 The design-token story is the strongest PX-W content in the platform

The token layer is where buzz does its most careful thinking, and it is
**measurable**.

**Two independent dials, composed deliberately.** `typography.css` documents the
model in its own header:

- **Cmd +/- zoom** scales the *real* root `<html>` font-size
  (`useWebviewZoomShortcuts.ts`). Every rem in the app — text, gaps, widths,
  radii — grows and shrinks together. The zoom factor is clamped to
  `[0.75, 1.5]` with a `0.1` step and persisted under `buzz:text-scale`. **This
  is true zoom.**
- **The Font size preference** sets `data-font-size` on the root and nudges
  *only the type scale*. Text changes without moving layout.

They compose through **one virtual rem**:

```css
--buzz-type-scale: 1;
--buzz-type-rem: calc(1rem * var(--buzz-type-scale));
--text-base: var(--buzz-type-rem);
--text-sm:  calc(var(--buzz-type-rem) * 0.875);
```

Because `--buzz-type-rem` is itself defined in `rem`, it **rides on top of zoom
automatically**, and the preference scales it alone. At default preference and
zoom it equals 16px, making `text-sm` 14px. The preference values are stated as
ratios so the contract survives a future base change:

```css
:root[data-font-size="smaller"] { --buzz-type-scale: calc(13 / 14); }
:root[data-font-size="larger"]  { --buzz-type-scale: calc(15 / 14); }
```

The documented conversation contract is **13 / 14 / 15px** before keyboard zoom,
and `AGENTS.md` records the *reason* it must stay tokenised: *"Keep those
relationships tokenized rather than restoring a fixed 16px chat baseline or
hardcoding preference-specific values in components."*

`tailwind.config.js` then makes the sub-`text-xs` ramp **rem-relative too**:

```js
"2xs": "calc(var(--buzz-type-rem) * 0.6875)", // 11px at 16px type rem
"3xs": "calc(var(--buzz-type-rem) * 0.5)",    // 8px at 16px type rem
badge: "calc(var(--buzz-type-rem) * 0.625)",  // 10px at 16px type rem
```

and — the detail I did not expect — **the `lineHeight` scale is rem-relative as
well**, with a stated reason: *"Keep fixed Tailwind line-height utilities in the
typography scale so Cmd +/- cannot enlarge glyphs inside an unchanged line box."*
That is a zoom-correctness argument applied to a token most codebases never
touch, and it is the kind of thing that only gets written down after it has gone
wrong.

**What the config comments carry.** The comments in `tailwind.config.js` are
themselves the history: *"These replaced the dozens of arbitrary `text-[…rem]`
literals that had drifted apart pixel-by-pixel"*, *"Do NOT reintroduce arbitrary
`text-[…rem]` / `text-[…px]` literals; the px-text guard rejects them."* The
config is enforcing a **one-scale consolidation** and says so.

### 1.4 The real composition unit is the event kind

buzz's answer to "what is the unit you compose with?" is the **Nostr event kind
integer**. `AGENTS.md` states the policy:

> **Prefer Nostr events over new HTTP endpoints** … model the operation as a
> Nostr event (a new kind in `buzz-core/src/kind.rs`, a handler in
> `buzz-relay`) rather than adding endpoint-specific JSON APIs … If you find
> yourself reaching for a new HTTP endpoint, first check whether an event kind
> would do the job — it usually will, and you get realtime fan-out, NIP-29
> scoping, and the existing auth pipeline for free.

Measured: **`crates/buzz-core/src/kind.rs` is 1,177 lines and defines 157
`pub const` kinds.** That is the platform's composition vocabulary — 157 nouns an
extension can be built from. Three of them are visible from batch 04/05 work:
`KIND_APPROVAL_REQUEST = 46010`, `KIND_FORUM_POST = 45001`, and canvas'
`kind:40100`; and the batch-04 workflow definition was `kind 30620`.

**This is the pivot the study should carry.** Where a widget platform composes
*UI elements*, buzz composes *signed events with integer types*, and the UI is a
fixed renderer over them. It is a coherent, fully-committed alternative — and it
is why buzz has no composer. **The event log is not the same thing as a widget
model**: an event log gives you extensibility of *data and behaviour*, while a
widget model gives you extensibility of *layout and interface*. buzz chose the
first and has none of the second. (This was the "deepest question this platform
poses" flagged at the batch-04 close; §6 answers it directly.)

---

## 2. PX-W — the two CI guards (the recommendation)

This is the section worth acting on. buzz encodes two frontend rules as
**executable checks wired into CI**, and each guard is structured identically:

```
scripts/check-<rule>-core.mjs         ← the shared, app-agnostic engine
<app>/scripts/check-<rule>.mjs        ← a thin per-app wrapper: rules + allowlists
<app>/package.json "check" script     ← wired into the app's check target
justfile "check"                      ← wired into the repo-wide gate
```

**Two rules are implemented this way:**

| Guard | Core | Desktop wrapper | Web wrapper | Mobile wrapper |
|---|---|---|---|---|
| `check-px-text` | `scripts/check-px-text-core.mjs` (129 lines) | `desktop/scripts/check-px-text.mjs` (39 lines) | — | — |
| `check-pubkey-truncation` | `scripts/check-pubkey-truncation-core.mjs` | `desktop/scripts/check-pubkey-truncation.mjs` | `web/scripts/check-pubkey-truncation.mjs` | — |

Note the asymmetry: **`check-px-text` is desktop-only; `check-pubkey-truncation`
is desktop + web.** A guard is applied where the rule is true, not everywhere for
uniformity. That is a deliberate, visible scope choice.

### 2.1 Guard 1 — `check-px-text`: design rule as executable check

The core's docblock states the root cause and the fix:

> Zoom (Cmd +/-) scales the root `<html>` font-size, so only **rem**-based text
> scales. Hardcoded px text sizes (`text-[15px]`, `font-size: 15px`) freeze
> against zoom — **that's the timeline regression we fixed**. This guard stops new
> px text sizes from creeping back in.

It flags two forms:

```js
const TEXT_ARBITRARY_RE = /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g;
const FONT_SIZE_PX_RE   = /(?<!-)\bfont-size:\s*\d+(?:\.\d+)?px/g;
```

Three engineering details stand out, all measured in the file:

- **It rejects arbitrary `rem` too, not just `px`** — and says why: *"Arbitrary
  rem literals re-fragment the scale we just consolidated."* A guard that only
  blocked `px` would let 51 distinct `text-[0.NNrem]` values drift back in. **The
  rule is "one scale", not "no pixels".**
- **The regex has a negative lookbehind** `(?<!-)` before `font-size` so it does
  NOT match CSS custom properties like `--font-size:` — which *"merely contain
  the substring"* and belong to third-party widgets. This is a false-positive the
  author hit and closed.
- **Windows path handling is done explicitly**, with the reason in a comment:
  *"`rules[].root` and the `overrides` keys are authored with `/`, but
  `path.relative` yields `\` on Windows — so every comparison against them has to
  happen in posix form or **it silently matches nothing**."* A cross-platform
  guard that would otherwise pass vacuously on Windows.

**The allowlist is the part to copy.** Desktop's four entries are keyed by
`relativePath:matchedLiteral` — matching the *literal*, not the line number:

```js
const overrides = new Set([
  "src/features/settings/ui/ProfileSettingsCard.tsx:text-[6rem]",
  "src/features/onboarding/ui/AvatarStep.tsx:text-[6rem]",
  "src/features/agents/ui/AgentCreationPreview.tsx:text-[4rem]",
  "src/features/agents/ui/AgentCreationPreview.tsx:text-[6rem]",
]);
```

The wrapper's comment gives the reason: *"Matching the literal keeps these
exceptions stable when unrelated edits move lines."* Compare this to a
line-number allowlist, which breaks every time someone inserts a line above it.
And the four exceptions are all the **same kind of thing** — fixed-size avatar
emoji glyphs sized to their avatar box, not readable message text. The allowlist
has a *thesis*, not just entries.

### 2.2 Guard 2 — `check-pubkey-truncation`: a security rule as executable check

This guard is better than the first, because the rule it enforces is a security
invariant with a one-line proof. The core's docblock:

> A truncated pubkey prefix is **forgeable by vanity-grinding**, so display
> truncation must be consistent and centralized: the canonical `truncateNpub`
> (identity keys — compact npub) and `truncatePubkey` (generic hex identifiers
> such as event/blob IDs) … **Ad-hoc `pubkey.slice(0, N)` display forms
> fragmented into five formats before this guard existed.**

That is a genuinely sharp piece of reasoning, and it generalises far beyond
Nostr: **any truncated identifier that a human uses to make a trust decision is
grindable to a collision by an attacker.** If five different parts of your UI
truncate the same key five different ways, a user who learns "my contact is
`npub1abc…`" can be fooled by a key that renders to the same prefix. The fix has
two parts — centralise the truncation, and make the *insecure* pattern a build
failure:

```js
const PUBKEY_SLICE_RE =
  /\b[A-Za-z_$][\w$]*(?:[Pp]ubkey|[Pp]ub_key|[Nn]pub)[\w$]*\??\.(?:slice|substring)\(|\b(?:pubkey|npub)\??\.(?:slice|substring)\(/g;
```

It deliberately matches the *shapes* of ad-hoc truncation
(`.slice(`/`.substring(` on any identifier whose name mentions pubkey/npub) —
not a fixed list of call sites.

**The allowlist design here is the most instructive artefact in the batch.**
Three mechanisms, each with a different justification:

1. **`allowedFiles` — the canonical module itself.**
   `src/shared/lib/pubkey.ts` is where truncation is *supposed* to happen, so it
   is exempted by path. Desktop also allows `src/testing/e2eBridge.ts` with the
   reason *"fabricates ids/nsecs from pubkeys; nothing here is a user-facing
   identity display."*
2. **`overrides` — `relativePath:lineNumber`, one entry per line, each with a
   written reason.** Desktop's seven entries are grouped by *category*, and the
   comments name the category: array windows (`first N pubkeys`, not string
   truncation), colour/initials derivation (*"clearly decorative (paired with a
   full `truncatePubkey` aria-label)"*), a `clientId` that happens not to be a
   pubkey, a debug log, an error-message prefix.
3. **`.test.` files are excluded wholesale** in the core.

Notice the deliberate difference between the two guards' override keys:
`check-px-text` pins the **literal** (stable under line moves), while
`check-pubkey-truncation` pins the **line number** (a `slice()` call has no
distinguishing literal). The choice is made per-guard according to what is
stable, and the reason is written in each file. That is exactly the discipline
rule 6 asks for.

### 2.3 Why this pattern is the batch's recommendation

Three properties make the guard pattern worth adopting:

- **The guard carries its own history.** Both cores state the regression that
  motivated them (PR #891 for px-text; *"five formats"* for truncation). A future
  contributor reading the guard learns *why*, not just *what*.
- **The allowlist is the design record.** Every exception has a reason, and the
  reasons cluster into a small number of legitimate categories. To add a new
  exception you must write a sentence justifying it — so the allowlist does not
  silently grow.
- **The enforcement is in the default gate.** Desktop's `pnpm check` runs
  `biome check . && pnpm check:px-text && pnpm check:pubkey-truncation`, and the
  repo-wide `just check` calls `desktop-check`, which calls `pnpm check`. A
  developer cannot commit a violation without seeing it.

**The runner-up pattern in the same family is the differential file-size
ratchet** (`scripts/check-file-sizes-core.mjs`, `desktop/scripts/file-size-policy.mjs`).
It is the third shared-core guard, and its design is the cleanest statement of
"ratchet, don't freeze" I have seen in this study:

```js
export function allowedLineCount(baseLines, maxLines) {
  return baseLines == null || baseLines <= maxLines ? maxLines : baseLines;
}
export function evaluateFileSize({ baseLines, candidateLines, maxLines }) {
  const limit = allowedLineCount(baseLines, maxLines);
  return { limit, violates: candidateLines > limit };
}
```

with the failure message stating the contract: *"Keep new files at or below the
limit; files already over it may not grow."* Per-surface limits are explicit and
different — **desktop frontend 1,200 / desktop Rust 1,500 / mobile 1,200 / web
1,000** — and the policy file carries a comment recording a bug that was fixed:
the `src-tauri/crates` root had to be added because *"a crate under
`src-tauri/crates/` is born outside the repo's one size discipline — silently,
since the check still exits 0."* **A guard with a comment naming its own past
blind spot is a guard you can trust.** The ratchet is deliberately
**differential** — it inspects only files changed from the merge base, *"so this
stays cheap enough to run unconditionally without dividing path filters"* — which
is why it can sit in `just check` and CI without slowing anyone down.

---

## 3. PX-F — the desktop architecture

### 3.1 The Tauri bridge is a second application

Measured: **`desktop/src-tauri/src` is 478 `.rs` files / 194,385 lines**, and
**385 `#[tauri::command]` functions** across **111 files in
`src-tauri/src/commands/`**. The bridge is where a very large fraction of the
product's behaviour actually lives.

What is in it (from `src-tauri/src/`, top level):

- **Sync and transport** — `event_sync.rs` (+ three test files:
  `event_sync_team_catalog_tests`, `event_sync_team_events_tests`,
  `event_sync_tests`), `native_relay_client.rs` (+ three test files),
  `native_websocket.rs` / `native_websocket_batch.rs`, `relay/`, `relay.rs`,
  `relay_admission.rs`.
- **Local state and identity** — `app_state.rs` + four sibling
  `app_state_*.rs` modules (`_accessors`, `_keyring`, `_pending_channels`,
  `_tests`), `identity_storage.rs`, `key_backup.rs`, `hpke_key_backup.rs`
  (+ test), `secret_store.rs`, `archive/`.
- **A local database** — `migration.rs` plus **eight** `migration_*_tests.rs`
  files (`_avatar`, `_command`, `_databricks`, `_sync_guard`, `_team_dir`,
  `_tests`, `_test_support`, and the base `migration_tests.rs`). Desktop keeps a
  local store and migrates it.
- **Native surfaces** — `app_menu.rs`, `tray_menu.rs`, `macos_notifications.rs`,
  `mouse_nav.rs`, `ptt_shortcut.rs` (push-to-talk), `prevent_sleep.rs`,
  `webkit_rendering.rs`, `linux_media.rs`, `initial_window.rs`.
- **A terminal runtime** — `terminal_runtime.rs` / `terminal_runtime/`,
  `terminal_transport.rs`.
- **Mesh compute / local LLM** — `mesh_llm.rs` / `mesh_llm/`,
  `mesh_llm_stubs.rs`, `managed_agents/`.
- **An egress guard** — `egress_guard.rs` (+ `egress_guard_tests.rs`), and
  `media_proxy.rs`.

Rule 6 — name the capability: **desktop is a full client with a native
application behind it**, not a web UI in a window. The 385 commands are the
interface between a React front end and a Rust program that owns the database,
the identity, the terminal, and the network.

**One detail worth carrying.** `commands/canvas.rs` shows the *house style* of
these commands: they take `expected_relay_url` and `expected_signer_pubkey` as
parameters and call an `assert_expected_scope` helper that refuses the operation
if the community or identity changed mid-flight. `commands/bestie.rs` shows the
same pattern applied more strictly — it captures
`state.workspace_apply_generation` before an `await`, re-reads it after, and
returns *"active workspace changed while resolving Bestie"* if it moved; and it
re-verifies the assignment after the round-trip. **This is the generation-fence
pattern from the Review-Proven Rules (§3.3, rule 2) applied at the command
boundary.** It is the same stale-state discipline we saw in Multica's batches and
in buzz's own P3, implemented in Rust at the Tauri seam.

### 3.2 The `shared/` layering is enforced by *convention* plus a guard triad

`desktop/src/shared/` is split into ten subdirectories, measured by file count:

| Directory | Files | Role |
|---|---:|---|
| `api/` | 130 | Tauri command wrappers, relay client, types |
| `ui/` | 149 | the 71 shadcn primitives + app-wide components |
| `lib/` | 102 | utilities (`cn`, `pubkey`, `platform`, media) |
| `styles/` | 21 | the global CSS layers |
| `hooks/` | 15 | shared React hooks |
| `layout/` | 14 | shell layout pieces |
| `theme/` | 13 | the adaptive theme engine + sync |
| `features/` | 10 | the feature-flag system (§4) |
| `context/` | 4 | shared React contexts |
| `constants/` | 2 | kinds and constants |

`desktop/src/app/` (82 files) is the shell; `desktop/src/features/` (31
directories) is the product. **The dependency rule is stated in `AGENTS.md`:
"Feature modules must not import from other feature modules — only from
`shared/`"** — and, critically, **I searched for an ESLint rule or any
enforcement and found none.** There is no `no-restricted-imports` config, no
custom lint plugin, no test. The boundary is a **written convention with no
executable check**.

Rule 1 applies honestly here: **the docs claim the boundary; the code does not
enforce it.** This is a *divergence* (D5-1) and I record it as one rather than
softening it. It is also the most direct contrast in the batch — buzz enforces
*px-text* and *pubkey truncation* with executable guards, but enforces
*architectural layering* with prose. The pattern it chose for design and security
rules was not applied to structure.

The linting story is consistent with a small team that trusts itself: **the repo
uses Biome, not ESLint** — `desktop/biome.json` is a two-line file
(`{"extends": ["../biome.json"]}`) over a root `biome.json` with
`"recommended": true` plus exactly one rule override
(`suspicious.noUnknownAtRules: "off"`, because Tailwind's `@apply` and friends
look like unknown at-rules). Measured: **there is no `eslint.config.*` or
`.eslintrc*` anywhere in the tree.** The linter is fast and opinionated and does
**not** carry architecture rules.

### 3.3 `AGENTS.md` — the institutional knowledge layer

`AGENTS.md` is **794 lines** and is not a style guide. Its "Review-Proven Rules"
section is **empirically derived from review history** and says so:

> These rules distill the recurring findings from the last 25 PRs' review
> threads — **53% of substantive review findings were repeats of the clusters
> below**, and reviewed PRs averaged ~5 review rounds. A second, independent
> mining pass over 71 agent-review rooms (303 findings, Aug 18–29) confirmed the
> same clusters and **measured how often authors actually fix each class once
> flagged: test-seam binding and unbounded-resource findings were fixed 100% of
> the time, swallowed-error findings 90%, stale-state races 70%** — these are not
> style opinions, they are defects authors agree with on sight. Each cites the
> PRs where reviewers litigated it.

This is unusual and worth naming: the rules carry **measured fix rates** and
**PR citations per rule**. There are eight rules; four matter for this study:

1. **Every caught failure must leave a durable retry record or propagate.** Never
   catch-log-and-return-success; never convert a terminal failure into an
   authoritative success/empty result; never delete the durable journal an
   operation depends on before its retry succeeded. (This is the *same* rule
   buzz's P3 follows with `PartialProgress`, and the same one the retirement rule
   in `library/development/WORKING-RULES.md` encodes.)
2. **Fence async results by generation.** A completing in-flight probe must
   verify it is still the newest before writing its result. (§3.1's `bestie.rs`
   is this rule, implemented.)
3. **Regression tests must bind the production seam and be falsifiable.** *"A
   guard whose removal doesn't fail any test protects nothing."* — the direct
   test of whether a guard is real.
4. **Bound every resource, loop, and process tree.** Cap captured output; retry
   loops need backoff *and a terminal state*.

Plus three that are squarely frontend:

6. **"A guard that hides the only recovery affordance is a functional failure."**
   Before adding a visibility predicate, ask whether the user still has a way
   back.
7. **Audit assistive semantics on every new visual component.** The
   agent-review lanes flagged accessibility on 44 findings in the Aug 18–29
   window — the second-largest cluster — and authors fixed the concrete ones.
   Rule: *"one owner per actionable label, no duplicate screen-reader stops, and
   explicit semantics for every interactive element."*
8. **Every input modality is a first-class seam.** Keyboard, pointer, and hotkey
   paths must not silently diverge (a `Shift+Space` treated as `Space` because
   the guard omitted `shiftKey`; modifier keys dropped on the non-mouse path).
   *"When adding an input handler, enumerate the modalities that can reach it and
   test the non-primary ones — that's where the defects were."*

Rule 7 and rule 8 are the two I would carry into our own SRS verbatim. Rule 8 in
particular is a *testable* statement about coverage that most frontends never
write down: **the input modality is the seam, and the primary modality is the one
that gets tested.**

`AGENTS.md` also carries a **`CONTEXT.md` glossary (53 lines) with `_Avoid_:`
anti-vocabulary lists** — each term names the word you must *not* use for it.
That is a small, cheap mechanism against vocabulary drift, and it is the same
class of protection as the L168 hazard from our own rules (copying another
platform's words without checking they mean the same thing here).

### 3.4 The mobile tree — an independent re-implementation

Measured: **`mobile/lib` is 456 Dart files** — 280 under `lib/features/` and 174
under `lib/shared/` — i.e. roughly the desktop app's *shape* (`features` +
`shared`) implemented in a different language with no shared core.

The rules in `AGENTS.md` are specific and enforceable at review:

- **"NEVER use `StatefulWidget`"** — state is Riverpod; local state is
  `flutter_hooks` via `HookConsumerWidget` / `ConsumerWidget`.
- **"Feature modules must not import from other feature modules — only from
  `shared/`."** — the *same* boundary as desktop, and here too I found no
  executable enforcement; `mobile/analysis_options.yaml` is
  `include: package:flutter_lints/flutter.yaml` plus `prefer_single_quotes: true`
  and **`custom_lint` plugins declared in `pubspec.yaml` (riverpod_lint) that
  have no custom rule package behind them** — `mobile/packages/` does not exist.
  So the mobile boundary is prose as well (D5-2).
- **"Prefer `context.colors` and `context.textTheme` (via theme extensions) over
  raw `Theme.of(context)`."**
- **"Do NOT use `print()`"** — use `debugPrint()` or structured logging.
- **"One public widget per file; push private sub-widgets (`_Foo`) into sibling
  `part` files."** — a file-organisation rule, reinforced by the 1,200-line
  ceiling.
- **"Multi-tenant model / identity"** — the mobile tree has its own
  `lib/features/pairing/` and `lib/features/invites/` that desktop does not.

The theme system is where mobile is *most* interesting, because it is a **full
re-implementation of the desktop engine in Dart**, and the port is documented as
such:

- `mobile/lib/shared/theme/adaptive_theme.dart` opens: *"Ported from
  `desktop/src/shared/theme/adaptive-theme.ts`."*
- `mobile/lib/shared/theme/theme_catalog.dart` opens: *"Static catalog of all 60
  Shiki syntax theme color definitions"* — the same Shiki theme JSON desktop's
  `theme-loader.ts` reads, projected into Dart constants.

Measured sizes: desktop `shared/theme/*.ts(x)` = **3,249 lines**; mobile
`shared/theme/*.dart` = **3,533 lines**. Two independent implementations of one
design language, **1,000+ lines each**, with **no shared source of truth and no
parity test** (I searched: no theme parity test exists).

The *one* place the two clients *are* forced together is the emoji dataset, and
the mechanism is worth copying: `mobile/scripts/generate-emoji-data.mjs` projects
`@emoji-mart/data/sets/15/native.json` — *"the same dataset the desktop picker
uses so the two clients cannot drift"* — into a committed JSON asset, and the
generator **fails loudly if the desktop install is missing** with the fix in the
message. Same glyphs, same ids, same names, same shortcodes, same category order,
by construction. `just mobile-emoji-data` regenerates it after a dependency bump.
**This is the pattern the theme system does NOT use** — and the contrast is the
finding: buzz solved client drift for emoji with a generator and left it unsolved
for themes, and the difference is visible in the file counts (one committed asset
vs. two hand-maintained engines).

### 3.5 The event-kind mirror — a contract with no lockstep check

`desktop/src/shared/constants/kinds.ts` is **176 lines**;
`mobile/lib/shared/relay/nostr_models.dart` is **391 lines**; the source of truth
`crates/buzz-core/src/kind.rs` is **1,177 lines / 157 constants**.

`AGENTS.md` states the contract: *"event kinds must stay in sync with
`desktop/src/shared/constants/kinds.ts`."* Measured: **`kinds.ts` has a test
(`kinds.test.mjs`) but it tests *behaviour* (`isConversationalUnreadKind`), not
*parity with Rust*.** I found no test asserting that the TS/Dart constants equal
the Rust constants, and no generated file. So the mirror is maintained **by
hand, across three languages, with no lockstep check** (D5-3).

The specific risk is stated in the file's own comments: several kinds carry a
comment pinning their *tag shape* to *"`buzz-sdk` builders + relay
`moderation_commands.rs`"* — i.e. the contract exists in prose between files.
For a platform whose entire composition vocabulary is these integers (§1.4),
hand-maintained mirrors are the weakest link in the extension story.

---

## 4. PX-F — the feature-flag system and the internal/OSS split

This is the most *product-specific* machinery in the batch, and it is clean.

### 4.1 The manifest is JSON, validated by zod, and **fail-open**

`desktop/src/shared/features/manifest.ts` loads `@features-manifest`
(`preview-features.json`) and **runtime-validates it with zod at startup**:

> On parse failure we fall back to an empty manifest and log a console warning.
> The app keeps working; gated UI stays hidden; nothing accidentally leaks.

The semantic contract — stated in three places (`types.ts`, `manifest.ts`,
`useFeatureEnabled.ts`) because it is easy to get wrong — is:

> The manifest (`preview-features.json`) lists ONLY preview features —
> membership signals "this needs gating." **Anything not in the manifest is
> treated as stable and renders unconditionally (fail-open).**

So: **in the manifest → gated (user override, then manifest default, off if
omitted); not in the manifest → always on.** The stated consequence is
deliberate: *"A stray `<FeatureGate feature="removed-id">` will never hide UI."*
An unknown id logs a dev warning and returns `true`.

This is the *opposite* of the safe default most flag systems choose, and the
reasoning is sound for this product: a flag's absence must not be able to hide a
working feature, because that failure mode is invisible and unrecoverable for the
user. **Fail-open on an unknown gate, fail-closed on the production build split
(§4.2).** Two different answers to "what does missing mean?", each chosen for the
failure it prevents.

Also worth noting: the manifest combines two sources — the shipped JSON and
`protectedFeatureDefinitions` from `@protected-features` (`[...manifest.features,
...protectedFeatureDefinitions]`) — so the internal build merges its protected
definitions into the same validated manifest rather than branching the code.

At the *client* level the hook uses `useSyncExternalStore` with a
**deliberately cached snapshot**. The comment explains the hazard precisely:
returning `JSON.stringify(getOverrides())` fresh each render *"would produce a new
string each tick → infinite re-render"*, so the serialised form is cached and a
new parsed object is minted only when it changes. It also supplies an explicit
`getServerSnapshot` returning `"{}"` with the reason: *"Buzz is a Tauri desktop
app and does not currently SSR. Returning an explicit empty-state snapshot is
safer than omitting this argument."* **Two subtle React correctness notes, both
written down, both in a file whose job is otherwise trivial.** Cross-window sync
is handled by listening for the `storage` event on the overrides key, mirroring
an existing house pattern (`useChannelSections` / `useChannelStars` /
`useChannelMutes` / `useThreadFollows`).

### 4.2 `protectedFeatures/` — an internal/public build split with a **verified** contract

buzz ships two desktop builds from one source tree, and **the protected content
is excluded from the OSS build by construction, not by `.env` discipline.**

The layout, measured:

```
desktop/src/protectedFeatures/
  internal.ts      → protectedFeatureDefinitions = [{ id: "bestie", … }]
  internalUi.ts    → the REAL implementations (11 exports)
  public.ts        → protectedFeatureDefinitions = []
  publicUi.ts      → the same 11 exports, every one a no-op/null
  bestie/          → 15 files: the actual feature
```

The mechanism is a **build-time module alias**: `@protected-features` resolves to
`internal.ts`/`internalUi.ts` in the internal build and `public.ts`/`publicUi.ts`
in the OSS build. Every public counterpart is a documented no-op —
`ProtectedGlobalOverlay` returns `null`, `useProtectedVisibleDirectMessages`
returns `channels` unchanged. **The OSS build does not contain the feature's
code; it contains a stub of the same shape.**

And the contract is **verified by building both**.
`desktop/scripts/build-protected-feature-artifacts.mjs` builds *both* variants
(the unselected one into a temp dir), then asserts:

```js
const protectedContent = /\bbestie\b|chief of staff|builtin:bestie/iu;
const internalManifestMarker = "Try a personal agent that is always close at hand";
if (protectedContent.test(ossText)) throw new Error(
  "Official OSS desktop artifact contains protected Bestie/Chief content");
if (!internalText.includes(internalManifestMarker)) throw new Error(
  "Protected internal desktop artifact is missing the Bestie manifest");
```

It scans the **emitted** `.css/.html/.js/.json` chunks, not the source — so the
check cannot be fooled by a feature that leaks only through the bundler. Both
directions are asserted: **no protected string in OSS, and the marker present in
internal** (a build that silently produced an empty internal variant also
fails). `VITE_BUZZ_BESTIE` is *pinned explicitly* to `"1"`/`"0"` for each child
with the reason: *"Deleting the OSS value lets Vite reload `=1` from `.env.local`
or a mode-specific env file."* That is a real leak closed.

The Tauri side is guarded by the same discipline: `desktop/scripts/tauri-command.mjs`
wraps the Tauri CLI so each packaging invocation gets a **private output
directory**, and it hands `frontendDist` a path **relative** to
`tauri.conf.json`'s directory — with the reason spelled out:

> `frontendDist` deserializes into an untagged enum whose first variant is a URL,
> and **a Windows absolute path parses as one — `C:` becomes the scheme.** Tauri
> then embeds **zero assets, exits 0, and the app boots to
> `ERR_FILE_NOT_FOUND`.**

So the rule is: never let `frontendDist` be absolute, and there is a test
(`tauriCommand.test.mjs`) asserting it stays relative, running **two opposite
variants concurrently** to prove they cannot overwrite each other's assets. **A
silent-success failure mode, closed by a wrapper plus a test that reproduces it.**
This is rule 3 from §3.3 ("falsifiable, bound to the production seam") actually
applied — the test spawns the real wrapper.

**Scope note for the study:** the split is not, by itself, a tenancy mechanism.
It separates a *commercial* feature from an *OSS* build. The tenant boundary
remains the community (batch 03). I record the split here because it is a PX-F
architecture pattern with a verified contract, **not** because it is tenancy.

---

## 5. Findings (F5-n)

**F5-1.** buzz has **no widget model and no composer** — proven by search, not
assumed. 27 `widget` hits tree-wide, all accounted for; the only `CREATE TABLE
widgets` is a negative fixture inside a `#[test]`. **Fifth platform in the study
with none.**

**F5-2.** The composition unit is the **Nostr event kind**: 157 `pub const` kinds
in a 1,177-line `kind.rs`, with a stated policy of *"prefer a new kind over a new
HTTP endpoint."* Extensibility is of data and behaviour, never of layout.

**F5-3.** **Two frontend rules are encoded as CI guards with shared cores** —
`check-px-text` (desktop) and `check-pubkey-truncation` (desktop + web). Each
core states its root cause and carries a narrow, reason-annotated allowlist. The
two guards use *different* allowlist key shapes (literal vs line number), chosen
per-guard and explained in-file. **This is the batch's recommendation.**

**F5-4.** `check-pubkey-truncation` enforces a **security invariant**:
truncated identifiers a human trusts are **forgeable by vanity-grinding**;
ad-hoc truncation had fragmented into five formats. The fix is
centralise-plus-fail-the-build. **Generalises far beyond Nostr.**

**F5-5.** `check-px-text` enforces **"one scale", not "no pixels"** — it rejects
arbitrary `rem`/`em` too, because those *"re-fragment the scale."* One-scale is
the actual rule; px is just its loudest symptom.

**F5-6.** The design-token model is the strongest PX-W content: **two independent
dials** (Cmd +/- true zoom over the real root rem, and a text-only Font size
preference) composed through **one virtual rem** `--buzz-type-rem`, with the
**`lineHeight` scale made rem-relative too** so zoom cannot enlarge glyphs inside
a fixed line box. Documented contract: 13/14/15px conversation text before zoom.

**F5-7.** A **differential file-size ratchet** (third shared-core guard) with
per-surface limits (desktop FE 1,200 / desktop Rust 1,500 / mobile 1,200 / web
1,000), explicitly **ratchet-not-freeze** (*"files already over it may not
grow"*), deliberately differential so it is cheap enough to run unconditionally,
and carrying a comment naming a past blind spot (`src-tauri/crates` was silently
ungoverned).

**F5-8.** **Desktop's Tauri bridge is a second application** —
`src-tauri/src` is **478 files / 194,385 lines** with **385 `#[tauri::command]`s
in 111 files**; it owns the local database (8 migration test files), identity,
terminal, media, mesh LLM, and an egress guard.

**F5-9.** **The generation-fence pattern is implemented at the Tauri command
boundary.** `bestie.rs` snapshots `workspace_apply_generation`, `await`s,
re-reads, and refuses if it moved; `canvas.rs` takes
`expected_relay_url`/`expected_signer_pubkey` and asserts scope. This is
Review-Proven Rule 2 as executable code.

**F5-10.** **Mobile is a full independent re-implementation with ZERO Rust** —
456 Dart files / 695 files / 218,357 lines, including a **3,533-line theme
engine ported from desktop's 3,249-line TS engine, with no shared source and no
parity test.** The Rust crates are shared everywhere *except* mobile.

**F5-11.** **Client drift is solved for exactly one artefact and left unsolved
for the rest.** Emoji is projected from desktop's `emoji-mart` data by a
generator (`mobile-emoji-data`) that *fails loudly* if the source is missing, so
shortcodes cannot drift; event kinds and themes are hand-maintained mirrors with
no lockstep check.

**F5-12.** **The feature-flag system is fail-open on unknown gates and
fail-closed on the production build split** — two opposite answers to "what does
missing mean?", each chosen for the failure it prevents. The manifest is
zod-validated at startup; invalid → empty manifest → *"nothing accidentally
leaks."*

**F5-13.** **The internal/OSS split is verified by building both variants and
scanning the emitted chunks**, in both directions (no protected string in OSS;
marker present in internal). `VITE_BUZZ_BESTIE` is pinned explicitly so an
`.env.local` cannot leak the internal build into OSS.

**F5-14.** **A silent-success failure mode is closed by a wrapper plus a test.**
Tauri's `frontendDist` untagged enum parses a Windows absolute path as a URL
(`C:` = scheme) and then **embeds zero assets, exits 0, and boots to
`ERR_FILE_NOT_FOUND`**. Closed by always emitting a config-relative path, with a
test that spawns the real wrapper and runs both variants concurrently.

**F5-15.** **`AGENTS.md` is an empirical institutional-knowledge layer, not a
style guide** — 794 lines whose Review-Proven Rules cite the PRs where each was
litigated and report **measured fix rates** (100% / 90% / 70%) and the mining
method (last 25 PRs, 53% repeat rate; a second pass over 71 agent-review rooms /
303 findings).

**F5-16.** **The canvas `set_canvas` two-stage concurrency check** is a
documented, honest design: pre-write precondition returns a frozen conflict
marker; post-write supersession re-reads and returns `CANVAS_SUPERSEDED` while
*preserving the revision in history*; and a **failed verification read reports
`verified: false`, never a failed save.** The residual race is named and deferred
to *"relay-side linearization (phase 2)."*

**F5-17.** **`CONTEXT.md` is a 53-line glossary whose entries carry `_Avoid_:`
anti-vocabulary lists** — a cheap, concrete defence against vocabulary drift of
the same class as our own L168 hazard.

**F5-18.** The product ships **two thin satellite clients**: `web/` (66 files /
4,719 lines) and `admin-web/` (17 files / 2,721 lines), together **~1.1% of
desktop's line count**. Desktop is 93% of the frontend.

---

## 6. Divergences (D5-n) — where a doc and the code disagree

**D5-1. The feature-module boundary is prose, not enforcement.** `AGENTS.md:730`
states *"Feature modules must not import from other feature modules — only from
`shared/`."* Measured: **no `no-restricted-imports`, no custom lint plugin, no
test** anywhere in the tree. The rule is real as a convention and absent as a
check. **Notably, buzz enforces *design* and *security* rules executably (F5-3)
and leaves *architectural* rules to prose.** Framing: a convention with no
enforcement is not wrong, but it is a *different kind of thing* from the guards
next to it, and the docs do not distinguish them.

**D5-2. Mobile's `custom_lint` is declared with no custom rule package.**
`mobile/pubspec.yaml` declares `custom_lint` and `riverpod_lint`, and
`analysis_options.yaml` enables `plugins: [custom_lint]` — but **there is no
`mobile/packages/` and no custom lint builder in the tree**, so the plugin slot
is occupied by third-party rules only. The mobile boundary rule (same words as
desktop's) has no executable backing either.

**D5-3. The event-kind mirror has no lockstep check.** `AGENTS.md` requires
`nostr_models.dart` to stay in sync with `kinds.ts`, and `kinds.ts` to mirror
`kind.rs` (157 constants). Measured: `kinds.test.mjs` tests behaviour, not
parity; there is **no test comparing the three files and no generator.** Given
F5-2 (kinds *are* the composition vocabulary), this is the weakest link in the
extension story — and it is the exact problem the emoji generator *did* solve
(F5-11), which shows the team knows the pattern.

**D5-4. `AGENTS.md`'s px-text guidance says "allowlisted by `path:line`" while
the desktop wrapper allowlists by `path:literal`.** `AGENTS.md` (Desktop App §)
says *"Genuinely decorative glyphs … are allowlisted by `path:line` in that
script"*; the script's own comment says matching the literal *"keeps these
exceptions stable when unrelated edits move lines"*, and the keys are
`…tsx:text-[6rem]`. **The code is correct and the doc is stale** — a small
instance of the batch-04 pattern (doc lags the code it describes), recorded for
completeness.

---

## 7. Pole verdict

**PX-W — widgets / composition.** **Absent as a model; present as a committed
alternative.** buzz composes *signed events with integer types* (157 kinds) and
renders them with a fixed UI, rather than composing UI elements. It has exactly
one composition-shaped surface (Channel Canvas / `kind:40100`), and that surface
is a **document with optimistic concurrency**, not a widget tree. Its design
system is a **vendored shadcn component directory with no registry and no
per-component contract.** **Fifth platform in the study with no widget/composer
model.**

What PX-W *does* contribute, and the reason to keep this batch, is the
**guard-as-document** pattern: two rules (`check-px-text`,
`check-pubkey-truncation`) plus a size ratchet, each with a shared core, a
stated root cause, a narrowly-scoped reason-annotated allowlist, and a place in
the default gate. That is a different and cheaper answer to "how does a frontend
stay consistent?" than a component registry (n8n) or a UI Lab (Multica), and it
scales down to a small team.

**PX-F — frontend.** **Desktop-first and polyglot, with the core shared
everywhere except mobile.** Desktop (Tauri 2 + React 19 + Vite + Tailwind +
shadcn + Biome) is ~93% of the frontend and carries a **194k-line Rust bridge**
with **385 commands**. Mobile is a **full Dart re-implementation with zero Rust**,
including a hand-ported 3,533-line theme engine. Web and admin are ~1.1% combined
thin clients.

The frontend's distinctive quality is **how much of its hard-won knowledge is
written down in an executable or citable form**: the token model states its two
dials and its line-height rationale; the guards state their root causes; the
review rules cite PRs and measured fix rates; the feature flags state
fail-open/fail-closed and why; the build split is verified by building both
variants. Where buzz has *not* done this — architectural layering (D5-1) and the
cross-language kind mirror (D5-3) — is exactly where the gaps are.

**The batch's answer to the question it inherited.** *Is an event log the same
thing as a widget model?* **No, and buzz is the clean demonstration of why.** An
event log gives you extensibility of **data and behaviour** — new kinds, new
handlers, realtime fan-out, scoping, auth for free (F5-2). A widget model gives
you extensibility of **layout and interface** — someone who is not a programmer
assembling a surface out of parts. buzz has the first in full and the second not
at all, and it is *coherent* about it: the surface set is fixed, the data model
is open, and the extension path is "add a kind". That is a legitimate product
position, and it is **the clearest statement in the study of what a platform
loses when it chooses an event log over a composer.**

---

## 8. Ranked actions

| # | Action | Why |
|---|---|---|
| 1 | **Adopt the guard-as-document pattern** for our own two or three most-broken frontend rules: a `scripts/check-<rule>-core.mjs`, a per-app wrapper carrying a reason-annotated allowlist, and a place in the default `check` gate. | It is cheap, it scales down, and it is the one PX-W artefact here that transfers without buzz's stack (F5-3, F5-4). |
| 2 | **Copy the *three* allowlist mechanisms, not one** — `allowedFiles` for the canonical module, `overrides` keyed by whichever of literal/line is *stable for that rule*, and a wholesale `.test.` exclusion. | The choice of key shape is per-rule and is the part a naive port gets wrong (F5-3). |
| 3 | **Adopt the fail-open/fail-closed asymmetry for feature gates** and write the answer to "what does *missing* mean?" next to every gate. | Two opposite answers, each chosen for the failure it prevents, both stated (F5-12). |
| 4 | **Adopt "two independent dials through one virtual rem"** for typography, including making the **`lineHeight` scale rem-relative**. | It is the strongest PX-W content and the line-height half is the part nobody thinks of (F5-6). |
| 5 | **Adopt the emoji-generator pattern for every cross-client constant** we will have — kinds, tokens, colour schemes. | buzz proves the pattern works and proves the cost of not applying it (F5-11, D5-3). |
| 6 | **Adopt the differential size ratchet** with per-surface limits and a *ratchet-not-freeze* rule. | Cheap enough to run unconditionally, and it catches the one-file disaster before review (F5-7). |
| 7 | **Adopt the generation fence at every async boundary** (`await` → re-read a generation → refuse if moved), and the explicit *scope assertion* parameters. | Already written as a rule in buzz's own review rules and implemented in Rust here; it is the same defect class as our own stale-state findings (F5-9). |
| 8 | **Adopt "verify the build split by building both and scanning the emitted output"** whenever we ship two variants from one tree. | Catches leaks the source-level check misses, and catches the *empty* variant (F5-13). |
| 9 | **Adopt `CONTEXT.md`-style `_Avoid_:` anti-vocabulary lists.** | Cheapest possible defence against the L168 vocabulary-drift hazard (F5-17). |
| 10 | **Study the `AGENTS.md` Review-Proven Rules format** — PR citations per rule, measured fix rates, and the *method* — before we write our own agent rules. | A rule with a citation and a fix rate is checked; a rule without one is a preference (F5-15). |

**Recommendation.** Take **#1, #2, #4, #7, #9** — the guard-as-document pattern
(including its three allowlist mechanisms), the two-dials-one-rem typography
model with the rem-relative line-height scale, the generation fence at async
boundaries, and the `_Avoid_:` glossary. These five are cheap, transfer without
buzz's stack, and each answers a defect class this study has already recorded.
Treat the internal/OSS split (F5-13) and the Tauri packaging wrapper (F5-14) as
**patterns to remember for when a silent-success failure mode or a variant leak
actually appears** — they are excellent, and they are solutions to problems we do
not yet have.

---

**Next:** `findings/06-out-of-pole.md` (PZ) — the security perimeter, the
observability story, the formal-methods-in-tree material
(`MultiTenantRelay.tla` / `MultiTenantAuth.spthy` / `GitOnObjectStore.tla`), the
conformance harness, and anything that does not sit on the three poles. Then
batch 07 (synthesis), and only then the buzz reader on port 3600, built from the
markdown.
