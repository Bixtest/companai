# Zulip Platform Study — Reader

> **A user-friendly way to read the Zulip platform study.**
> Offline-first, zero-dependency, dual-mode reading suite. Every word of the 8 study
> batches, unabridged, with an interactive SVG architecture guide for each batch.

---

## What this is

This folder turns the markdown study in `../` (the `zulip-forensics/` folder) into a
browsable, themeable reading application. It never *contains* the study — it *renders* it.
The source of truth is always the markdown one level up:

```
zulip-forensics/
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
    ├── serve.js                  ← local static server (port 3800)
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
Then open http://localhost:3800.

> The Hermes reader uses 3000, Paperclip 3100, CrewAI 3200, Multica 3300, Gas Town 3400,
> n8n 3500, buzz 3600 and OpenRig 3700; **this one uses 3800** so all nine can run side by side.

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

**12 ranked mechanisms** — the ★-named findings the synthesis elevates from the **8
★-headed sections** in batches 02–06 (02/03/04/05 ×1, 06 ×4), plus 4 lifted from
inside them — and **30 divergences** (D1-1..D6-5, five per findings batch).

> **Note on structure:** unlike the earlier studies, the Zulip batches carry **no numbered
> F-register**. Findings are named (rule 6) and pole-tagged rather than numbered, and every
> batch ends in its own divergences table. That is the study's shape, not an omission.

## What Zulip is (in one paragraph)

Zulip is a **mature, decade-old team-chat product run by thousands of organisations** — a
Python/Django monolith (425,702 LOC) with a separate Tornado service for real-time event
delivery, a hand-written TypeScript client that is deliberately *not* a framework SPA
(153,253 LOC), PostgreSQL, RabbitMQ and Redis behind it, and **789 numbered migrations**.
Its defining structural choice is that **every message carries a topic**, and its defining
architectural choice is that **tenancy is ambient**: the organisation (a `Realm`) is derived
from the request's Host header and enforced by a single comparison, so a caller cannot pass
the wrong tenant even by accident.

Three things make it worth reading: **the strongest P2 in the study** (the ambient realm,
with email unique only *within* a realm — tenancy baked into the user's identity);
**the study's first real widget model** (a widget is an append-only `SubMessage` log,
replayed); and **the densest guard culture** (`check-schemas` across three representations,
the `API_FEATURE_LEVEL` ratchet, `mark_sanitized`, and `AGENTS.md`).

## Editing or extending

See **[HOW-TO-UPDATE.md](HOW-TO-UPDATE.md)**. In short: edit the markdown in `../`, run
`node generate-reader.js`, refresh the browser. Never edit the generated HTML by hand — it is
overwritten on every build.

---

*Zulip Platform Study • Three-Pole Frame • Unabridged Text Integrity Verified*
