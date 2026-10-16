# Hermes Forensic Reader — Content Authoring & Extension Guide

> **Authoritative Developer & Author Guide**  
> How to edit existing reports, add new documents/batches, call architectural diagrams in content, add new diagrams to the visual catalog, and rebuild the application suite.

---

## 📑 Table of Contents
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

The Hermes Forensic Reader is built as an **offline-first, zero-dependency, dual-mode reading suite**:

```
hermes-forensics/
├── 00-PIN-AND-METHOD.md                  # Batch 00 source markdown
├── findings/                             # Batches 01 to 12 source markdowns
│   ├── 01-agent-loop-and-conversation.md
│   ├── ...
│   └── 12-SYNTHESIS.md
├── index.html                            # Master SPA reader (pre-rendered Batch 00)
├── pages/                                # 13 standalone HTML pages (one per batch)
│   ├── 00-the-pin-method.html
│   ├── ...
│   └── 12-the-synthesis-decision.html
├── assets/
│   ├── docs-data.js                      # Bundled offline data (HTML, raw MD, TOCs, stats, diagrams)
│   ├── reader.css                        # Modern responsive styles, fluid scaling, 4 themes
│   ├── reader.js                         # Master client controller (slider, routing, search, gallery)
│   └── marked.min.js                     # Zero-dependency local markdown parser
├── diagrams.js                           # SVG architecture diagrams & master catalog
├── generate-reader.js                    # Generator script with auto-discovery engine
├── serve.js                              # Local HTTP static server
├── verification-report.json              # Cryptographic/character audit ledger
├── README.md                             # User-facing summary & quick start
└── HOW-TO-UPDATE.md                      # This comprehensive guide
```

> **Note on Folder Portability (`reader/` subfolder):**  
> The reader files (`index.html`, `assets/`, and `pages/`) are completely self-contained with relative paths. You can keep them at the root, or organize them into a `reader/` subfolder (or move `reader/` to an entirely different computer). Both `generate-reader.js` and `serve.js` automatically detect if a `reader/` directory exists and will build and serve directly from `reader/` without any manual configuration changes.

### Core Invariants:
1. **100% Unabridged Text Fidelity:** No words, code blocks, tables, quotes, or headings are ever truncated, summarized, or omitted.
2. **Dual-View Reading:** The reader offers both an elegant rendered reading view and a verbatim raw markdown tab side-by-side.
3. **Zero-CORS Offline Support:** Content is bundled in `assets/docs-data.js` so `index.html` and standalone pages work directly by double-clicking in file managers via `file:///` protocols without CORS blocking.

---

## 2. Editing Existing Content

All substantive report content resides in pure Markdown files. **Never edit the generated HTML files directly**, as they will be overwritten during regeneration.

### File Locations:
- **Batch 00:** `00-PIN-AND-METHOD.md`
- **Batches 01–12:** `findings/01-*.md` through `findings/12-*.md`

### Guidelines for Editing:
- **Headings:** Use `#` for the main document title, `##` for major sections (§X.Y), and `###` for sub-sections. The generator automatically builds the Table of Contents from `##` and `###` levels.
- **Tables:** Use standard GitHub-Flavored Markdown tables. The generator automatically wraps all tables in `<div class="table-container">` with responsive horizontal scrolling and sticky headers.
- **Code Blocks:** Fenced code blocks with language identifiers (e.g. ```` ```python ````, ```` ```bash ````, ```` ```typescript ````) are automatically equipped with 1-click **Copy** buttons and language badges.
- **Special Seals & Badges:** Include phrases like `VERIFIED IN CODE`, `Divergence`, or `RECOMMENDATION` in heading text to have the generator automatically render visual badge seals.

### Applying Your Edits:
After making edits to any `.md` file, run:
```bash
node generate-reader.js
```
This updates `index.html`, `assets/docs-data.js`, the corresponding standalone page in `pages/`, and updates `verification-report.json`.

---

## 3. Adding New Documents / Batches

The generator features an **Auto-Discovery Engine**. You do not need to modify build configuration files or write boilerplate HTML.

### Step-by-Step Instructions:

#### Step 1: Create the Markdown File
Place your new `.md` file in `findings/` (or in the project root if it is an overview batch).

**Naming Convention:**
- Recommended: `findings/13-continuous-operations.md` or `findings/14-federated-mesh.md`.
- Numbers should follow the sequence of your batches.

#### Step 2: Include Standard Header & Metadata
At the very top of your new markdown file, provide the title, status, and date:

```markdown
# Batch 13 — Continuous Operations & Monitoring
**Status:** DONE
**Date:** 2026-10-15

## §13.1 Operational Cadence & Supervision
Your comprehensive, unabridged forensic analysis goes here...
```

#### Step 3: Run the Generator
Run the generator in your terminal:
```bash
node generate-reader.js
```

#### What the Auto-Discovery Engine Automatically Performs:
1. **Metadata Extraction:** Extracts the document title from the `# ` heading, the batch number from the filename/heading, the status, and the date.
2. **Table of Contents & Slug Generation:** Parses all `##` and `###` headings, assigns collision-resistant anchor slugs, and constructs the TOC tree.
3. **Text Fidelity Ledger:** Calculates line count, word count, character count, and estimated reading time.
4. **Standalone HTML Page:** Creates a dedicated page in `pages/` (e.g. `pages/13-continuous-operations.html`) with font sliders, theme switchers, and full navigation.
5. **Master SPA Integration:** Adds the new document to the Master Reader's sidebar navigation (`#sidebarDocsList`), generates its search index entries, and wires prev/next buttons.
6. **Data Bundle Update:** Writes the rendered HTML, raw verbatim markdown, TOC, and metadata into `assets/docs-data.js`.
7. **Audit Trail:** Appends the document's verification metrics to `verification-report.json`.

---

## 4. Calling Architecture Pieces in Content

The reader suite includes an **Architecture Linker** that allows you to cross-reference visual architecture diagrams directly within your markdown prose.

### The In-Text Link Syntax:
To link to any architecture diagram, write a standard Markdown link with the special `diagram:` protocol:

```markdown
[View the Child Agent Delegation Hierarchy](diagram:06)
[Examine the 4-Tier Security Defense Matrix](diagram:08)
[Review the Executive Master Topology](diagram:master)
```

### What Happens in the Reader:
- The generator detects `diagram:id` links and transforms them into interactive UI pills:
  ```html
  <button type="button" class="diagram-trigger-pill" onclick="window.HermesReader.switchDiagram('06')">
    🏛️ View the Child Agent Delegation Hierarchy
  </button>
  ```
- When a reader clicks the pill:
  1. The diagram container above the article switches to that specific diagram.
  2. If the diagram section was collapsed, it automatically expands.
  3. The page smoothly scrolls up to display the diagram.

### Complete Catalog of Available Diagram IDs:

| Diagram ID | Title & Focus Area | Subsystem Category |
| :--- | :--- | :--- |
| `master` | Executive Topology: Nous Hermes vs Platform Architecture | Strategic Architecture |
| `00` | Batch 00: Forensic Pin & Codebase Anatomy (698k LOC Breakdown) | Foundations |
| `01` | Batch 01: Agent Loop Execution Flow (Think-Act-Observe Cycle) | Execution Engine |
| `02` | Batch 02: Profile Boundary & Bot Routing (Profiles vs Sandbox) | Execution Engine |
| `03` | Batch 03: 3-Way Self-Improving Learning Loop (`/learn` + Curator) | Intelligence & Memory |
| `04` | Batch 04: 4-Tier Memory & Dynamic Tail Sizing (2KB Limits, `/journey`) | Intelligence & Memory |
| `05` | Batch 05: Tool Registry, MCP Gateway & Semantic Tool Search | Tools & Gateway |
| `06` | Batch 06: Child Agent Delegation Tree & `/goal` Quality Gate | Orchestration |
| `07` | Batch 07: 24-Platform Session Pipeline & 99-Section Dashboard | Orchestration |
| `08` | Batch 08: 4-Tier Security Defense Matrix (Hardline Floor Boundary) | Security & Governance |
| `09` | Batch 09: Model Routing, Fallback Providers & Chore Lane Split | Execution Engine |
| `10` | Batch 10: Plugin Contract, Middleware Hooks & ACP Server Adapter | Extensibility |
| `11` | Batch 11: Omni-Channel Gateway & `iron-proxy` Egress Injection | Channels & Networking |
| `12` | Batch 12: Strategic Synthesis & Build AROUND Blueprint | Strategic Decision |

---

## 5. Adding New Architecture Diagrams to the Catalog

If you want to add a brand-new explanatory SVG diagram to the system:

### Step 1: Define the SVG in `diagrams.js`
Open `diagrams.js` and add a new generator function (e.g. `getBatch13Diagram()`):

```javascript
function getBatch13Diagram() {
  return `
<div class="arch-diagram-wrapper">
  <div class="arch-diagram-header">
    <span class="arch-diagram-title">Batch 13: Continuous Operations & Mesh Architecture</span>
    <span class="arch-diagram-tag">Runtime Supervision</span>
  </div>
  <div class="arch-svg-container">
    <svg viewBox="0 0 960 320" xmlns="http://www.w3.org/2000/svg">
      <!-- Your SVG artwork here with system-ui fonts and theme CSS variables -->
    </svg>
  </div>
</div>`;
}
```

### Step 2: Register in `DIAGRAMS_CATALOG`
In `diagrams.js`, add an entry to the `DIAGRAMS_CATALOG` array:

```javascript
{
  id: '13',
  batchNum: '13',
  title: 'Batch 13: Continuous Operations & Mesh Architecture',
  category: 'Operations',
  description: 'Supervision tree, heartbeat monitoring, and failover state machines.'
}
```

### Step 3: Register in `getAllDiagrams()`
In `diagrams.js`, register the ID in the `getAllDiagrams()` function:

```javascript
function getAllDiagrams() {
  const map = {
    'master': { id: 'master', html: getMasterDiagram() }
  };
  ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'].forEach(num => {
    map[num] = { id: num, html: getBatchDiagram(num) };
  });
  return map;
}
```

### Step 4: Rebuild
Run `node generate-reader.js`. The new diagram is instantly available in the dropdown switcher, in the Architecture Gallery modal, and via `[link](diagram:13)`.

---

## 6. Typography, Components & Styling Standards

All reader styles are controlled by CSS custom variables in `assets/reader.css`:

### Relative Font Scaling:
The font slider changes a single root variable:
```css
:root {
  --content-font-size: 16px;
}
```
All article typography uses relative units (`rem` / `em`):
- `h1`: `calc(var(--content-font-size) * 1.85)`
- `h2`: `calc(var(--content-font-size) * 1.45)`
- `h3`: `calc(var(--content-font-size) * 1.2)`
- Paragraphs & lists: `var(--content-font-size)`
- Code blocks & tables: `calc(var(--content-font-size) * 0.92)`

This guarantees that sliding the font size scales every heading, paragraph, table cell, and code line in uniform harmony.

### Color Themes Supported:
- `data-theme="light"`: Editorial crisp clean theme.
- `data-theme="dark"`: Obsidian dark theme with high-contrast text.
- `data-theme="sepia"`: Warm parchment theme optimized for long forensic reading sessions.
- `data-theme="night"`: Cyber dark with deep navy/black tones.

---

## 7. Build & Verification Workflow

Whenever you change content or code, execute:

```bash
node generate-reader.js
```

### Build Verification Checklist:
1. Ensure the command exits with code `0`.
2. Check the console output:
   ```
   Processing X documents (auto-discovered)...
   ✓ batch-00: ...
   ✓ batch-01: ...
   TOTAL: X documents, Y words, Z lines, N chars.
   ✓ assets/docs-data.js generated.
   ✓ index.html generated.
   ✓ standalone pages generated in pages/ directory.
   ✓ verification-report.json written.
   ```
3. Inspect `verification-report.json` to confirm that all documents have `"fidelityVerified": true` and accurate word/line counts.

---

## 8. Serving & Testing Locally

### Option A: Direct File Opening (No Server Needed)
Double-click [`index.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/index.html) or any file in [`pages/`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages).
Because `assets/docs-data.js` loads via a standard `<script>` tag, modern browsers permit full execution under `file:///` without local CORS restrictions.

### Option B: Built-in Static Server
Run the zero-dependency Node static server:
```bash
node serve.js
```
Then open `http://localhost:3000` in your browser.

---

## 9. Troubleshooting & FAQs

### Q: I edited a `.md` file, but the browser doesn't show the changes.
- **Cause:** You may need to run `node generate-reader.js` to rebuild the bundle and HTML files.
- **Fix:** Run `node generate-reader.js`, then perform a hard refresh in your browser (<kbd>Ctrl</kbd> + <kbd>F5</kbd> or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>).

### Q: A newly added `.md` file in root isn't showing up.
- **Cause:** Files named `README.md`, `HOW-TO-UPDATE.md`, `UPDATING-AND-EXTENDING.md`, and `to-do.md` are reserved for developer guides and excluded from study batches.
- **Fix:** If the file is a forensic batch report, place it inside `findings/` (e.g. `findings/13-new-topic.md`) or name it with a batch prefix (e.g. `13-NEW-TOPIC.md`).

### Q: How do I test keyboard navigation?
- Press <kbd>/</kbd> to trigger full-text search across all documents.
- Press <kbd>A</kbd> to open the Architecture Gallery modal.
- Press <kbd>[</kbd> and <kbd>]</kbd> to cycle between previous and next batches.
- Press <kbd>Esc</kbd> to dismiss any open modal.

---

*Hermes Forensics Study Platform • Build AROUND Protocol • Unabridged Text Integrity Verified*
