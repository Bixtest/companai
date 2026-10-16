# Hermes Forensic Study — Executive Master Reader Suite

An executive-grade, offline-first reading environment for the **Hermes Agent Forensic Study** (Nous Research Pinned Tree, 19,728 files, 455 docs / 8.9 MB, 1,819 Python files / 698k LOC).

---

## 🛡️ Critical Invariant: 100% Unabridged Text Fidelity

Every single word, sentence, table cell, code block, quote, bullet point, heading, and metadata parameter from all **13 original markdown documents** is **100% preserved**.

- **Total Documents:** 13
- **Total Source Lines:** 3,575
- **Total Words:** 38,349
- **Total Characters:** 258,783
- **Omitted Content:** **0 bytes (Zero)**

A complete integrity ledger is recorded in [`verification-report.json`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/verification-report.json). In addition, every document features an instant **"Verbatim Raw Markdown"** tab right beside the formatted reading view for total transparency.

---

## 🚀 How to Open and Read

### Option 1: Double-Click (Zero Setup, 100% Offline)
Simply double-click [`index.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/index.html) to open the unified Master Reader in any web browser (Chrome, Edge, Firefox, Safari). No web server, node, or internet connection is required.

### Option 2: Local Static Server
If you prefer browsing via HTTP `localhost`:
```bash
node serve.js
```
Then navigate to `http://localhost:3000`.

### Option 3: Standalone Batch Pages
Every document is also available as an independent standalone HTML page inside the [`pages/`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages) directory:
- [`00-the-pin-method.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/00-the-pin-method.html)
- [`01-agent-loop-conversation.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/01-agent-loop-conversation.html)
- [`02-bots-profiles-group-chats.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/02-bots-profiles-group-chats.html)
- [`03-skills-learning-loop.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/03-skills-learning-loop.html)
- [`04-memory-context.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/04-memory-context.html)
- [`05-tools-mcp-gateway.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/05-tools-mcp-gateway.html)
- [`06-scheduling-delegation.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/06-scheduling-delegation.html)
- [`07-sessions-dashboard.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/07-sessions-dashboard.html)
- [`08-security-sandboxing.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/08-security-sandboxing.html)
- [`09-models-providers.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/09-models-providers.html)
- [`10-plugins-extensibility.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/10-plugins-extensibility.html)
- [`11-channels-iron-proxy.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/11-channels-iron-proxy.html)
- [`12-the-synthesis-decision.html`](file:///c:/Users/Ramzi/Downloads/hermes-forensics/pages/12-the-synthesis-decision.html)

---

## 🎨 Reading Features

1. **Relative Font-Size Slider:**
   - Real-time proportional scaling from `12px` to `28px` (80% to 160%).
   - Uses CSS relative custom properties (`--content-font-size`) so headings (`h1` through `h6`), body paragraphs, blockquotes, code blocks, lists, and tables scale seamlessly in harmony without clipping or layout breaking.
   - Includes quick-adjustment buttons (`A-`, `A+`) and a 1-click `Reset` to default (16px).
   - Saved across sessions in `localStorage`.

2. **Typography & Layout Customization:**
   - **Font Families:** Modern Sans (`Inter`), Classic Editorial Serif (`Merriweather`), or Technical Monospace (`JetBrains Mono`).
   - **Reading Widths:** Reading Column (760px), Standard (900px), Wide (1180px), or Full Width.
   - **Color Themes:** ☀️ Editorial Light, 🌙 Obsidian Dark, 📜 Sepia Parchment (recommended for reading long forensics reports), 🌌 Cyber Night.

3. **Explanatory Graphical Representations (Architectural Diagrams):**
   - High-precision, theme-adaptive SVG architecture diagrams created for every batch + an Executive Overview topology map (14 diagrams in total).
   - **Dynamic Diagram Switcher:** Right above the diagram section on any page, a dropdown lets you switch on the fly to inspect *any* of the 14 architecture pieces.
   - **Global Architecture Gallery Modal:** Press <kbd>A</kbd> or click the "Architecture Guides" button in the header to open a visual grid of all 14 diagrams with summaries, full-resolution views, and one-click jump buttons to the relevant report.
   - **Collapsible:** Toggle guides open/closed anytime with a single click.

4. **Calling Architecture Pieces in Content:**
   - In any markdown document (existing or newly added), you can reference any visual architecture piece by writing standard markdown link syntax:
     ```markdown
     [Inspect Delegation Tree](diagram:06)
     [Review Security Matrix](diagram:08)
     [Examine Executive Topology](diagram:master)
     ```
   - The reader automatically converts these links into interactive pill buttons (`🏛️ Inspect Delegation Tree`). Clicking a pill switches the in-page architecture guide to that diagram and scrolls to it smoothly.

   **Available Diagram IDs:**
   | Diagram ID | Title & Focus Area |
   |------------|-------------------|
   | `master` | Executive Topology: Nous Hermes vs Platform Architecture |
   | `00` | Forensic Pin & Codebase Anatomy (698k LOC Breakdown) |
   | `01` | Agent Loop Execution Flow (Think-Act-Observe Cycle) |
   | `02` | Profile Boundary & Bot Routing |
   | `03` | 3-Way Self-Improving Learning Loop (`/learn` + Curator) |
   | `04` | 4-Tier Memory & Dynamic Tail Sizing |
   | `05` | Tool Registry, MCP Gateway & Semantic Tool Search |
   | `06` | Child Agent Delegation Tree & `/goal` Quality Gate |
   | `07` | 24-Platform Session Pipeline & Dashboard Surface |
   | `08` | 4-Tier Security Defense Matrix (Hardline Floor) |
   | `09` | Model Routing, Providers & Chore Lane Split |
   | `10` | Plugin Contract, PTC Execution & ACP Server |
   | `11` | Omni-Channel Gateway & `iron-proxy` Egress Injection |
   | `12` | Strategic Synthesis & Build AROUND Blueprint |

5. **Interactive Navigation & Search:**
   - **Sticky Table of Contents:** On the right sidebar with ScrollSpy that highlights your exact position as you scroll.
   - **Global Search:** Press `/` to search across all 13 documents simultaneously with highlighted keyword matching.
   - **Keyboard Navigation:** Use `[` and `]` to navigate between batches.
   - **Reading Progress Bar:** Displays real-time scroll progress across the top of the viewport.
   - **Code Blocks:** One-click copy buttons and syntax blocks.
   - **Tables:** Wrapped in responsive horizontal scrolling containers with frozen headers.

---

## ➕ How to Add or Edit Pages

The architecture is built from the ground up to be **modular, extensible, and non-disruptive**:

### Adding a New Document:
1. Place your new `.md` file in the root folder or inside `findings/` (e.g. `findings/13-continuous-operations.md`).
2. Format the heading and metadata standardly:
   ```markdown
   # Batch 13 — Continuous Operations
   **Status:** DONE
   **Date:** 2026-10-15
   
   ## §13.1 Overview
   Your uncompromised forensic text here...
   ```
3. Run:
   ```bash
   node generate-reader.js
   ```
4. **Auto-Discovery:** The generator automatically detects the new file, extracts its title, batch number, status, and date, builds its table of contents and stats, embeds its verbatim markdown and rendered HTML, generates a standalone page in `pages/`, adds it to the Master Reader's navigation, updates search indexes, and logs an entry in `verification-report.json`.

### Editing an Existing Document:
1. Modify any of the markdown files in `00-PIN-AND-METHOD.md` or `findings/*.md`.
2. Run:
   ```bash
   node generate-reader.js
   ```
3. Both the Master SPA (`index.html`) and the standalone pages (`pages/*.html`) will instantly update while preserving 100% unabridged fidelity.

---

## 📖 Detailed Authoring Guide

For comprehensive documentation on the internal auto-discovery engine, the full diagram catalog, adding new SVG diagrams to `diagrams.js`, and styling customizations, refer to:
👉 [**`HOW-TO-UPDATE.md`**](file:///c:/Users/Ramzi/Downloads/hermes-forensics/HOW-TO-UPDATE.md)

