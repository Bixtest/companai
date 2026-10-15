# Multica Platform Study Reader — Content Authoring & Extension Guide

> **Authoritative Developer & Author Guide**
> How to edit existing reports, add new documents/batches, call architectural diagrams in
> content, add new diagrams to the visual catalog, and rebuild the application suite.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Editing Existing Content](#2-editing-existing-content)
3. [Adding New Documents / Batches](#3-adding-new-documents--batches)
4. [Calling Architecture Pieces in Content](#4-calling-architecture-pieces-in-content)
5. [Adding New Architecture Diagrams to the Catalog](#5-adding-new-architecture-diagrams-to-the-catalog)
6. [Typography, Components & Styling Standards](#6-typography-components--styling-standards)
7. [Build & Verification Workflow](#7-build--verification-workflow)
8. [Serving & Testing Locally](#8-serving--testing-locally)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. Architecture Overview

The Multica Platform Study Reader is built as an **offline-first, zero-dependency, dual-mode
reading suite**. It is a copy of the Hermes reader engine, retargeted at a different study — the
engine is platform-agnostic; only two things change per platform (`DOCS_CONFIG` and `diagrams.js`).

```
multica-forensics/
├── 00-PIN-AND-METHOD.md                  # Batch 00 source markdown
├── findings/                             # Batches 01 to 07 source markdowns
│   ├── 01-platform-overview.md
│   ├── ...
│   └── 07-SYNTHESIS.md
└── reader/                               # Everything generated lives here
    ├── index.html                        # Master SPA reader (pre-rendered Batch 00)
    ├── pages/                            # 8 standalone HTML pages (one per batch)
    │   ├── 00-the-pin-method.html
    │   ├── ...
    │   └── 07-the-synthesis.html
    ├── assets/
    │   ├── docs-data.js                  # Bundled offline data (HTML, raw MD, TOCs, stats, diagrams)
    │   ├── reader.css                    # Modern responsive styles, fluid scaling, 4 themes
    │   ├── reader.js                     # Master client controller (slider, routing, search, gallery)
    │   └── marked.min.js                 # Zero-dependency local markdown parser
    ├── diagrams.js                       # SVG architecture diagrams & master catalog
    ├── generate-reader.js                # Generator script with auto-discovery engine
    ├── serve.js                          # Local HTTP static server (port 3300)
    ├── verification-report.json          # Character/word audit ledger
    ├── README.md                         # User-facing summary & quick start
    └── HOW-TO-UPDATE.md                  # This comprehensive guide
```

> **Note on Folder Portability (`reader/` subfolder):**
> The generator detects its own location. If it sits inside a folder literally named `reader`,
> it reads the source markdown from the **parent** folder (`../`) and writes its output into
> `reader/`. If it sits directly beside the markdown, it reads and writes in place. This is why
> this study can carry its own `reader/` with zero configuration.

### Core Invariants:
1. **100% Unabridged Text Fidelity:** No words, code blocks, tables, quotes, or headings are ever
   truncated, summarized, or omitted.
2. **Dual-View Reading:** Both an elegant rendered view and a verbatim raw markdown tab.
3. **Zero-CORS Offline Support:** Content is bundled in `assets/docs-data.js` so `index.html` and
   the standalone pages work by double-clicking via `file:///` with no CORS blocking.

---

## 2. Editing Existing Content

All substantive report content resides in pure Markdown files. **Never edit the generated HTML
files directly**, as they are overwritten during regeneration.

### File Locations:
- **Batch 00:** `../00-PIN-AND-METHOD.md`
- **Batches 01–07:** `../findings/01-*.md` … `../findings/07-*.md`

### Guidelines for Editing:
- **Headings:** Use `#` for the document title, `##` for major sections (§X.Y), and `###` for
  sub-sections. The generator builds the Table of Contents from `##` and `###` levels.
- **Tables:** Use standard GitHub-Flavored Markdown tables. They are wrapped automatically in a
  responsive scrolling container with sticky headers.
- **Code Blocks:** Fenced blocks with a language identifier get 1-click **Copy** buttons and
  language badges automatically.
- **Special Seals & Badges:** Include `VERIFIED IN CODE`, `Divergence`, or `RECOMMENDATION` in a
  heading to have a visual badge seal rendered automatically.

### Applying Your Edits:
After editing any `.md` file, run:
```bash
node generate-reader.js
```
This updates `index.html`, `assets/docs-data.js`, the corresponding standalone page, and
`verification-report.json`.

---

## 3. Adding New Documents / Batches

The generator features an **Auto-Discovery Engine**. You do not need to modify build config or
write boilerplate HTML.

### Step 1: Create the Markdown File
Place the new `.md` in `../findings/` (or in the study root for an overview batch).

**Naming Convention:** `findings/08-your-topic.md` — numbers should follow the sequence.

### Step 2: Include a Standard Header
```markdown
# Multica Study — Batch 08: your topic
**Status:** DONE
**Date:** 2026-10-15

## §8.1 Your first section
Your comprehensive, unabridged forensic analysis goes here...
```

### Step 3: Run the Generator
```bash
node generate-reader.js
```

### What the Auto-Discovery Engine Does Automatically:
1. **Metadata Extraction** — title from the `# ` heading, batch number from the filename/heading,
   status and date from the `**Status:**` / `**Date:**` lines.
2. **TOC & Slug Generation** — parses `##` and `###`, assigns collision-resistant anchors.
3. **Text Fidelity Ledger** — line count, word count, char count, estimated reading time.
4. **Standalone HTML Page** — a dedicated page in `pages/` with sliders, themes and navigation.
5. **Master SPA Integration** — adds to the sidebar, search index, and prev/next wiring.
6. **Data Bundle Update** — writes rendered HTML, raw markdown, TOC and metadata into `docs-data.js`.
7. **Audit Trail** — appends verification metrics to `verification-report.json`.

> **Prefer an explicit entry for a *new* batch.** Auto-discovery works, but the hand-written
> `DOCS_CONFIG` block at the top of `generate-reader.js` is what gives a batch its curated
> `shortTitle`, `category` (which becomes its dropdown group) and `summary`. Add an entry there
> for anything important.

---

## 4. Calling Architecture Pieces in Content

The reader includes an **Architecture Linker** so you can cross-reference the SVG diagrams from
within the markdown prose.

### The In-Text Link Syntax:
```markdown
[View the delivery layer's one-statement claim](diagram:04)
[Examine the machine/teammate split](diagram:02)
[Review the executive master topology](diagram:master)
```

### What Happens in the Reader:
- The generator turns `diagram:id` links into interactive pills:
  ```html
  <button type="button" class="diagram-trigger-pill" onclick="window.MulticaReader.switchDiagram('04')">
    🏛️ View the finite-run continuity law
  </button>
  ```
- Clicking a pill switches the diagram container to that diagram, expands the section if
  collapsed, and scrolls it into view.

### Complete Catalog of Available Diagram IDs:

| Diagram ID | Title & Focus Area | Subsystem Category |
| :--- | :--- | :--- |
| `master` | Executive Topology: the three poles and the two absent layers | Strategic Architecture |
| `00` | Batch 00: The pin, the code-dominant shape, and the method | Foundations |
| `01` | Batch 01: The control plane — server, daemon, queue, cron, fence | Foundations |
| `02` | Batch 02: The aissistant — machine, teammate, one seam | Pole 1 — The Aissistant |
| `03` | Batch 03: The workspace — a fenced tenant | Pole 2 — The Workspace |
| `04` | Batch 04: Automations — the delivery layer | Pole 3 — Automations |
| `05` | Batch 05: Widgets & frontend — and the absent widget model | Cross-Cutting |
| `06` | Batch 06: Out-of-pole — perimeter, plugin reset, cutover | Escape Hatch |
| `07` | Batch 07: The synthesis — ranked mechanisms and the verdict | Strategic Decision |

---

## 5. Adding New Architecture Diagrams to the Catalog

### Step 1: Define the SVG in `diagrams.js`
Add a `case '08':` branch to `getBatchDiagram()`, following the pattern of the existing cases —
each returns a self-contained string wrapped in `<div class="diagram-wrapper">`. There is a small
`card(x, y, w, h, title, lines)` helper you can reuse for the repeated panels.

### Step 2: Register in `DIAGRAMS_CATALOG`
```javascript
{ id: '08', batchNum: '08', title: 'Batch 08: Your Topic', category: 'Your Group',
  description: 'One line that explains what the diagram shows.' }
```
The `category` string becomes the `<optgroup>` label in the dropdown — the dropdown is generated
from the catalog, so it can never drift.

### Step 3: Register in `getAllDiagrams()`
```javascript
['00', '01', '02', '03', '04', '05', '06', '07', '08'].forEach(num => {
  map[num] = { id: num, html: getBatchDiagram(num) };
});
```

### Step 4: Rebuild
Run `node generate-reader.js`. The diagram appears in the dropdown, the gallery, and via
`[link](diagram:08)`.

---

## 6. Typography, Components & Styling Standards

All styles are controlled by CSS custom variables in `assets/reader.css`.

### Relative Font Scaling:
The font slider changes a single root variable:
```css
:root { --content-font-size: 16px; }
```
Article typography uses relative units (`rem` / `em`), so sliding the size scales every heading,
paragraph, table cell and code line in harmony.

### Colour Themes:
- `data-theme="light"` — editorial crisp clean.
- `data-theme="dark"` — obsidian dark, high contrast.
- `data-theme="sepia"` — warm parchment for long sessions.
- `data-theme="night"` — cyber dark, deep navy/black tones.

Diagrams use the same CSS variables (`var(--surface-card)`, `var(--text-primary)`, …) so they
follow the theme automatically.

---

## 7. Build & Verification Workflow

```bash
node generate-reader.js
```

### Build Verification Checklist:
1. The command exits with code `0`.
2. Console output looks like:
   ```
   Processing 8 documents (auto-discovered)...
   ✓ batch-00 (00-PIN-AND-METHOD.md): 2012 words, 12 TOC sections
   ...
   TOTAL: 8 documents, 16,608 words, 1,741 lines, 110,868 chars.
   ✓ assets/docs-data.js generated.
   ✓ index.html generated.
   ✓ 8 standalone pages generated in pages/ directory.
   ✓ verification-report.json written.
   ```
3. Inspect `verification-report.json` — every document must have `"fidelityVerified": true`.

> **A stability check that catches silent drift:** the total **character** count must equal the
> character count of the source markdown. Because the generator reads and re-emits the text
> verbatim, any change to that total means a source file changed.
>
> **Do not compare against `wc -c`.** That counts **bytes**, and these files contain multi-byte
> UTF-8 (em dashes, arrows, bullets, ×, ≈), so bytes will exceed characters by a constant
> overhead. Compare against a character count instead, e.g.
> `python -c "import glob;print(sum(len(open(f,encoding='utf-8').read()) for f in ['00-PIN-AND-METHOD.md']+sorted(glob.glob('findings/*.md'))))"`.
> For this study: **177,688 characters** (178,931 bytes — 1,243 bytes of UTF-8 overhead).

---

## 8. Serving & Testing Locally

### Option A: Direct File Opening (No Server Needed)
Double-click [`index.html`](../reader/index.html) or any file in `pages/`. Both work under
`file:///` without a server.

### Option B: Built-in Static Server
```bash
node serve.js
```
Then open http://localhost:3300. (The Hermes reader uses 3000, Paperclip 3100, CrewAI 3200 and Multica 3300, so all four can run together.)

---

## 9. Troubleshooting & FAQs

### Q: I edited a `.md` file, but the browser doesn't show the changes.
- **Cause:** You must rebuild the bundle.
- **Fix:** Run `node generate-reader.js`, then hard-refresh (<kbd>Ctrl</kbd>+<kbd>F5</kbd>).

### Q: The build says `Processing 0 documents`.
- **Cause:** The generator cannot find the markdown. It reads from the study root — the parent of
  this `reader/` folder.
- **Fix:** Confirm `../00-PIN-AND-METHOD.md` and `../findings/*.md` exist.

### Q: A newly added `.md` file in root isn't showing up.
- **Cause:** `README.md`, `HOW-TO-UPDATE.md`, `UPDATING-AND-EXTENDING.md` and `to-do.md` are
  reserved for developer guides and excluded from the study batches.
- **Fix:** Place study reports in `findings/` or name them with a batch prefix (e.g. `08-TOPIC.md`).

### Q: How do I test the keyboard navigation?
- <kbd>/</kbd> full-text search · <kbd>A</kbd> gallery · <kbd>[</kbd> <kbd>]</kbd> prev/next ·
  <kbd>Esc</kbd> dismiss.

---

*Multica Platform Study Reader • Three-Pole Frame • Unabridged Text Integrity Verified*
