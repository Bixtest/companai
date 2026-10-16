# OpenRig Platform Study — Reader

> **A user-friendly way to read the OpenRig platform study.**
> Offline-first, zero-dependency, dual-mode reading suite. Every word of the 8 study
> batches, unabridged, with an interactive SVG architecture guide for each batch.

---

## What this is

This folder turns the markdown study in `../` (the `openrig-forensics/` folder) into a
browsable, themeable reading application. It never *contains* the study — it *renders* it.
The source of truth is always the markdown one level up:

```
openrig-forensics/
├── 00-PIN-AND-METHOD.md          ← Batch 00 (source of truth)
├── findings/                     ← Batches 01–07 (source of truth)
│   ├── 01-platform-overview.md
│   ├── ...
│   └── 07-synthesis.md
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
    ├── serve.js                  ← local static server (port 3700)
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
Then open http://localhost:3700.

> The Hermes reader uses 3000, Paperclip 3100, CrewAI 3200, Multica 3300, Gas Town 3400,
> n8n 3500 and buzz 3600; **this one uses 3700** so all eight can run side by side.

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

**79 findings** across the six analysis batches — F1-1..F1-10, F2-1..F2-13, F3-1..F3-12 + F3-3b,
F4-1..F4-13, F5-1..F5-15, F6-1..F6-15 — plus **34 divergences** (D1-1..D1-10, D2-1..D2-5,
D3-1..D3-4, D4-1..D4-5, D5-1..D5-5, D6-1..D6-5), the pole verdicts, and the synthesis.

## What OpenRig is (in one paragraph)

OpenRig is a **local daemon + CLI + terminal UI + MCP server** that runs a team of
**unmodified Claude Code and Codex sessions** inside tmux, and adds the coordination around
them — launching, restoring, messaging, a durable queue, and per-seat skills and context.
It is a TypeScript monorepo of four packages (3,685 files, 105 migrations) with one SQLite
file at `$OPENRIG_HOME/openrig.sqlite` and the daemon on port 7433.

Three things make it worth reading: **the strongest permission seam in the study** (the
two-surface rule — launch flags may be deterministic code; config-file policy may not);
**no tenancy at all** (0 `tenant_id` — the first platform in the study with none); and
**the study's most transferable gate culture** (the four-rail exclusion ledger, and a green
that records the load it ran under).

## Editing or extending

See **[HOW-TO-UPDATE.md](HOW-TO-UPDATE.md)**. In short: edit the markdown in `../`, run
`node generate-reader.js`, refresh the browser. Never edit the generated HTML by hand — it is
overwritten on every build.

---

*OpenRig Platform Study • Three-Pole Frame • Unabridged Text Integrity Verified*
