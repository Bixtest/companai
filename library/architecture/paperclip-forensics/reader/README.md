# Paperclip Platform Study — Reader

> **A user-friendly way to read the Paperclip platform study.**
> Offline-first, zero-dependency, dual-mode reading suite. Every word of the 8 study
> batches, unabridged, with an interactive SVG architecture guide for each batch.

---

## What this is

This folder turns the markdown study in `../` (the `paperclip-forensics/` folder) into a
browsable, themeable reading application. It never *contains* the study — it *renders* it.
The source of truth is always the markdown one level up:

```
paperclip-forensics/
├── 00-PIN-AND-METHOD.md          ← Batch 00 (source of truth)
├── findings/                     ← Batches 01–07 (source of truth)
│   ├── 01-platform-overview.md
│   ├── ...
│   └── 07-SYNTHESIS.md
└── reader/                       ← THIS FOLDER (generated + engine)
    ├── index.html                ← Master SPA reader (open this)
    ├── pages/                    ← 8 standalone pages, one per batch
    ├── assets/
    │   ├── docs-data.js          ← generated bundle (HTML + raw markdown + TOC + stats)
    │   ├── reader.css            ← themes, typography, layout
    │   ├── reader.js             ← master controller (slider, routing, search, gallery)
    │   └── marked.min.js         ← local markdown parser (no network)
    ├── diagrams.js               ← the SVG architecture guides
    ├── generate-reader.js        ← the build script
    ├── serve.js                  ← local static server (port 3100)
    ├── verification-report.json  ← the text-fidelity ledger
    └── README.md / HOW-TO-UPDATE.md
```

## Quick start

**Option A — just open it (no server):**
Double-click `index.html`. The page loads its data through a plain `<script>` tag, so
modern browsers run it fully under `file:///` with no CORS problems.

**Option B — local server (recommended for the search + gallery):**
```bash
node serve.js
```
Then open http://localhost:3100.

> The Hermes reader uses port 3000; this one uses 3100 so the two can run side by side.

## Keyboard shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>/</kbd> | Full-text search across all 8 batches |
| <kbd>A</kbd> | Open the Architecture Gallery (all 9 visual guides) |
| <kbd>[</kbd> / <kbd>]</kbd> | Previous / next batch |
| <kbd>Esc</kbd> | Close any open modal |

## The 8 batches

| # | Title | Pole |
| :--- | :--- | :--- |
| 00 | The pin, the method, and what this study is | Foundations |
| 01 | The platform overview | Foundations |
| 02 | The aissistant | Pole 1 |
| 03 | The workspace | Pole 2 |
| 04 | Automations | Pole 3 |
| 05 | Widgets and the frontend | Cross-cutting |
| 06 | Out-of-pole findings | Escape hatch (PZ) |
| 07 | The synthesis | Decision |

## Editing or extending

See **[HOW-TO-UPDATE.md](HOW-TO-UPDATE.md)**. In short: edit the markdown in `../`, run
`node generate-reader.js`, refresh the browser. Never edit the generated HTML by hand — it is
overwritten on every build.

---

*Paperclip Platform Study • Three-Pole Frame • Unabridged Text Integrity Verified*
