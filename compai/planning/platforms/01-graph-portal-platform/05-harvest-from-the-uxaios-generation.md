# 05 — Harvest from the never-assessed UXAIOS generation

**Written:** 2026-10-03
**Subject examined:** `E:\brainstorming\projecting\project` — a later, larger copy of the
Graph Portal Platform that **the 2026-08-08 assessment never saw**.
**Purpose:** decide what, if anything, in that copy is worth carrying into
`companai\workspace\starting-kit`.
**Companion documents:** [P1 verdict](02-verdict.md) · [P1 salvage map](03-identity-and-salvage-map.md) ·
[P1 docs-review notes](04-docs-review-notes.md)

---

## 0. Why this document exists

The P1 assessment was made against a 219-file snapshot. That snapshot is now gone from
`companai`, but a copy survives at `Downloads\Aiaiai\backend-starter`, and I measured it at
**219 source files / 31,220 LOC** — an exact file-count match to the "219 source files ·
~30,700 LOC" recorded in [03 §4.8](03-identity-and-salvage-map.md). So the assessment's
coverage is known.

But **four copies of this platform survive, and one of them is 3.2× bigger.** Nobody has ever
looked at it. This document is that look.

### Method, and its limits — read this before trusting a number

- Every size figure is `.ts`/`.tsx` excluding `node_modules`, `dist` and `.d.ts`, counted from
  the filesystem.
- Every "starting-kit does not have this" claim is a `git grep` over starting-kit's **tracked**
  files, and I then **re-read the hits** rather than trusting the count. That step mattered: a
  search for `knowledge base` returned 16 files, and all 16 were PNG screenshot filenames.
- **Limit 1:** `companai\Platform` is gone, so I cannot diff it against `backend-starter`. The
  219-file match is strong evidence they are the same snapshot, but it is inference from two
  agreeing numbers, not a diff.
- **Limit 2:** I read the ~20 most substantial files of the new code, not all 52,000 new lines.
  Where I did not read something, I say so.

---

## 1. What the copy is, and how it differs

`E:\brainstorming\projecting\project` — `package.json` name `graph-portal-platform`, version
`0.1.0`, same README first line as P1. It has a `.git` directory but **no commits** (branch
`master`, empty), so there is no history to date it by.

| | Assessed snapshot | This copy | Delta |
|---|---|---|---|
| Source files | 219 | **692** | +473 |
| Lines of code | 31,220 | **83,362** | +52,142 |
| Test files | 62 | **188** | +126 |
| Newest source file | 2026-08-05 | 2026-08-07 | — |

By package:

| Package | Assessed | This copy |
|---|---|---|
| `packages/domain` (contracts) | 28 files / 1,173 LOC | **56 / 6,141** |
| `packages/uxaios-core` | *absent* | **69 / 5,014** |
| `packages/uxaios-runtime` | *absent* | **12 / 678** |
| `packages/visualization` | 8 / 130 | **30 / 1,976** |
| `packages/config` | 6 / 80 | 14 / 996 |
| `packages/db` | 10 / 3,882 | 16 / 2,288 |
| `packages/ui` | 14 / 206 | 12 / 265 |
| `apps/api` | 92 / 8,746 | **227 / 41,776** |
| `apps/web` | 92 / 21,028 | 243 / 23,304 |
| `apps/worker` | 5 / 141 | 13 / 924 |

**New API modules** not in the assessed snapshot: `knowledge`, `uxaios`, `integrations`,
`content-roles`, `platform-roles`, `tenant-roles`.

### Are the new files real, or the usual claims?

The assessment's sharpest warning was that this platform's documentation marked features
"Shipped" that `grep` could not find. So before crediting anything:

- **Stub-marker scan across `uxaios-core` + `uxaios-runtime`: 0 hits** for
  `not implemented | unimplemented | TODO | FIXME | stub | placeholder`.
- Every substantial file has a **paired `.test.ts`** — 126 more test files than the assessed
  snapshot.
- The two smallest files, `garage.ts` (703 bytes) and `assets-store.ts` (82 bytes), are
  re-export barrels — the logic is in `garage-registry.ts` and `assets-store-registry.ts`.

**Verdict: the code is real.** But — and this is the finding that shapes everything below — it
is **real at foundation scale, not product scale.** `garage-registry.ts` registers 8 hardcoded
ingredients. `ai-dataset-registry.ts` holds 6 demo records with mock embeddings
(`platform.mock-embed-v1`). The value is in the **shapes and contracts**, not in the volume of
working behaviour.

---

## 2. The findings, ranked

### Finding 1 — The Knowledge Platform ★★★

**What it is.** A complete knowledge module: ingestion, knowledge databases, a knowledge tree,
page bodies, page tokens, rendered documents, search and feedback.

**Where.**
- `apps/api/src/modules/knowledge/` — 15 files: `knowledge.service.ts`,
  `knowledge-ingestion.service.ts`, `knowledge-database.service.ts`,
  `knowledge-rendered-doc.service.ts`, `knowledge-page-token.ts`, `knowledge.repository.ts`,
  `knowledge.controller.ts`, plus 4 test files
- `packages/domain/src/` — `knowledge-platform.ts` (12,679 B), `knowledge-ingestion.ts` (6,517 B),
  `knowledge-page-body.ts` (5,048 B), `knowledge-database.ts` (4,859 B), `knowledge-tree.ts`,
  `knowledge-search.ts`, `knowledge-feedback.ts`, `knowledge-icons.ts`
- `docs/architecture/knowledge-platform-contract.md` (5,832 B) · `knowledge-cell-contract.md`
  (1,521 B) · `docs/KNOWLEDGE-PLATFORM-FORENSIC-REPORT.md`
- `KNOWLEDGE-PLATFORM-DEPLOY.md` — "Knowledge Platform rounds **K-00 through K-08 complete**"

**Does starting-kit have it?** No. `git grep` for `knowledge.cell|knowledgeCell` → **0 files**;
`knowledge.ingest|knowledgeIngest` → **0 files**. The 70 files matching `knowledge` are upstream
Open Mercato's `.ai/specs` docs and a handful of tests.

**Important nuance — do not overstate the gap.** Open Mercato already ships the *retrieval
substrate*: `packages/search/src/` has `fulltext/`, `vector/`, `indexer/`, `queue/`,
`strategies/`, and there is a `query_index` module with its own migrations, API, backend UI and
subscribers. What is missing is the layer above it: ingestion pipelines, named knowledge
databases, page bodies, a knowledge tree, and feedback.

**Why it matters for us.** [04-docs-review-notes](04-docs-review-notes.md) §B1 calls the
Knowledge Cell "the standout idea in the entire doc set" and records it as **Integrated** into
[04 §4.3](../../04-context-graph-and-tags.md). Companai's AI workers need company-owned
knowledge, and this copy shows the shape of it.

**Verdict: worth harvesting — as design.** Take the domain contracts and the service
decomposition; do not lift the code (different stack). Priority: **high**.

---

### Finding 2 — Beams and Flow Trace ★★★

**What it is.** Typed relationships as first-class objects with their own identity, and a
visual trace of a flow through the graph.

**Where.** `packages/uxaios-core/src/` — `beam-ref.ts` (676 B), `trace-beam-flow.ts` (1,095 B),
`flow-closure.ts` (4,213 B), `flow-layout.ts` (1,488 B),
`ingredients/flow-default.beam.ts`, `ingredients/flow-directed.beam.ts`,
`ingredients/dependency.beam.ts`. Backed by `packages/domain/src/uxaios.ts` (9,398 B) and a
`traceBeamFlow` capability in `capability-registry.ts`.

**Does starting-kit have it?** Partly. `git grep` for `beam` returned 3 files and **all three
are false positives** — a screenshot PNG, a UI component, and `yarn.lock`. So no beam feature.
But `relationshipType` appears in 14 files, concentrated in the org-graph work under
`packages/core/src/modules/directory/` (`organization-edges`, `hierarchy.ts`, `entities.ts`),
plus `packages/ai-assistant/.../entity-graph.ts`. **So typed relationships exist — scoped to the
organisation graph.** A *general* relationship object that any two records can be joined by does
not.

**Why it matters for us.** [04](04-docs-review-notes.md) §B4 integrated Beams into
[04 §2.5](../../04-context-graph-and-tags.md), and §B5 says of Flow Trace: *"it is the demo that
sells the governance model."* For a governance product, being able to click an act and see the
whole chain that produced it is the feature that makes the model legible.

**Verdict: worth harvesting — as design, and this is the most Companai-relevant item here.**
Priority: **high**.

---

### Finding 3 — The Garage ★★

**What it is.** A registry of reusable UI ingredients (containers, widgets, beam types) with
semantic versioning, a deprecation policy, and validation that a composition only uses
registered ingredients.

**Where.** `packages/uxaios-core/src/` — `garage-registry.ts` (4,510 B), `garage-semver.ts`
(1,532 B), `validate-composition-garage.ts` (2,230 B), `bootstrap-ingredients.ts` (4,743 B), and
8 ingredient manifests under `src/ingredients/` — 8 source files, each with a compiled `.d.ts`
alongside (`hero-panel.container`, `card-panel.container`, `standard-panel.container`,
`form-shell.widget`, `kernel-table.widget`, and 3 beam types).
Contract: `docs/architecture/garage-ingredient-types.md`.

**Does starting-kit have it?** No — `git grep garage` → **0 files**. But there is partial
overlap: Open Mercato ships a design system with a component registry
(`packages/ui/src/backend/fields/registry.ts` + `registry.generated.ts`), a substantial
`docs/design-system/` set (component-apis, component-specs, contributor-guardrails,
coverage-report), and a very large widget-injection surface (`widget.*injection` → 464 files).
What it does **not** have is semantic versioning, a deprecation path, ingredient kinds, or
composition validation.

**Why it matters for us.** Maps to SRS FR-270…283 (app builder / micro-apps). [04](04-docs-review-notes.md)
§B2 records the Garage as **Integrated** into [01 §3.2](../../01-core-architecture.md). The
*versioning and deprecation* half is the part with no Open Mercato equivalent, and it is the
part that matters for a product promising safe composition.

**Verdict: worth harvesting — the versioning/deprecation design specifically.** Priority: **medium.**

---

### Finding 4 — Module package trust and loading ★★

**What it is.** A contract for loading a module as a *package* — with a checksum, a trust
decision, and a staged install preflight.

**Where.** `packages/domain/src/module-package.ts` (**17,615 B — the largest contract file in
the whole copy**), `module-install-preflight.ts` (10,156 B), `module-package-checksum.ts`
(1,099 B), and the decision record `docs/architecture/decisions/003-module-package-trust-and-loading.md`.

**Does starting-kit have it?** Not this. Open Mercato's modules are **in-repo and build-time**:
`src/modules.ts` lists enabled modules, `yarn generate` emits registries, and checksums exist for
*generated files* (`.generated.ts.checksum`), not for third-party packages. There is no
install preflight, no authority gate on installation, no package trust decision.

**Why it matters for us.** [03 §4.6](03-identity-and-salvage-map.md) rated P1's module install
pipeline **PATTERN** — "the contract is excellent, the code isn't there". In this copy it *is*
there. [04](04-docs-review-notes.md) §C3 records the staged pipeline as **Integrated** into
[01 §3.3](../../01-core-architecture.md), including the detail that Stage 0 statically inspects
source for audit-boundary compliance.

**Verdict: worth harvesting — as design.** But note: this only pays off if Companai ever loads
modules it did not build. Today it does not. Priority: **medium-low.**

---

### Finding 5 — The AI dataset slicing model ★★

**What it is.** A governed dataset contract: named datasets, each with `permission_refs`,
records, vector refs (with `content_hash` and a `locator`), and a sync block tracking
`last_synced_at` / `status` / `record_count` / `vector_count`.

**Where.** `packages/domain/src/ai-dataset.ts` (1,878 B) and
`packages/uxaios-core/src/ai-dataset-registry.ts` (3,523 B).

**Does starting-kit have it?** No. `ai-dataset` → 0 files.

**Why it matters for us.** [04](04-docs-review-notes.md) §B9 identifies this as the design
Companai independently arrived at — granting knowledge to an AI worker **by Lens, not by
enumeration** — and records it as *"independent arrival at the same design — no change needed,
confidence raised."* The contract here is the concrete form of it. [04](04-docs-review-notes.md)
§B7 also integrated the **citation triple** (`source_type` · `locator` · `content_hash`); this
dataset contract is where that triple is actually expressed.

**Verdict: worth harvesting — the contract shape, not the demo data.** Priority: **medium.**

---

### Finding 6 — Theme stack, skins and slots ★

**What it is.** A composed theming layer: a theme stack with resolution order, a slot registry,
named skins, and a theme-stack contract.

**Where.** `packages/uxaios-core/src/` — `theme-stack.ts`, `resolve-theme-stack.ts` (6,113 B),
`theme-registry.ts`, `theme-slot-registry.ts`, `skin-registry.ts`, `skins/enterprise.skin.ts`,
`skins/midnight.skin.ts`, `themes/*.theme.ts`. Contract:
`docs/architecture/theme-stack-composition.md` (9,666 B).

**Does starting-kit have it?** No — `theme.stack|themeStack` → **0 files**;
`composition.dna` → **0 files**. (`skin` returns 82 files, but they are upstream `.ai/` docs and
skill files, not a theming system.)

**Why it matters for us.** [04](04-docs-review-notes.md) lists "Skins / themes / space templates"
under **Deliberately not taken**, with the reason "presentation-layer and safely deferred.
Recorded for later." Separately, `product-identity` keeps a standing white-labelling list and
`use-the-waiting-time` says a half-rebranded product is worse than an honest fork. This copy is
the only place that work exists.

**Verdict: deferred, but keep the address.** Priority: **low** — consistent with the existing
decision, now with somewhere to look when it is picked up.

---

### Finding 7 — The design documents themselves ★★★

**What it is.** The original documentation set behind every idea in
[04-docs-review-notes](04-docs-review-notes.md) — which is currently **not present anywhere in
`companai`**. I checked for `AI-FIRST-PLATFORM-POLICY.md`, `GAP-ANALYSIS-2026.md`,
`PLATFORM-FEATURE-INVENTORY.md`, `knowledge-cell-contract.md` and
`platform-foundation-brainstorm.md` across all of `companai` (excluding starting-kit):
**0 copies.**

**Where.** `E:\brainstorming\projecting\project\docs\` —
- `architecture/` — 14 contracts, including `module-loader-contract.md` (12,877 B),
  `module-integration-and-ai.md` (9,293 B), `release-0-foundation.md` (14,785 B),
  `integration-extension-contract.md`, `garage-ingredient-types.md`, `knowledge-cell-contract.md`,
  `ui-portability-tags.md`
- `architecture/decisions/` — 8 ADRs, including `001-authentication-and-request-identity.md`,
  `003-module-package-trust-and-loading.md`, `006-canonical-sql-migration-source.md`,
  `008-uxaios-integrated-platform.md`
- `uxaios/` — 23 documents, including `VISION.md`, `ARCHITECTURE.md`,
  `PLATFORM-FEATURE-INVENTORY.md`, `PLATFORM-FEATURE-SPECS-BATCH-01…06.md`, `PLATFORM-PAGE-MAP.md`
- top level — `AI-FIRST-PLATFORM-POLICY.md`, `GAP-ANALYSIS-2026.md`, `platform-dictionary.md`
  (30,101 B), `IMPLEMENTATION_PLAN.md` (18,351 B), `STABILIZATION-LOG.md` (73,669 B),
  `handover.md` (50,255 B), `development-cookbook.md` (68,035 B)
- `formalize-platform-audit/` — 49 documents, of which the numbered set runs `01-public-context`
  through `15-ai-first-operating-model` (including `14-graph-portal-architecture.md`), with the
  remainder as supporting files

A second, partially-overlapping copy of the vision set sits at
`E:\brainstorming\projecting\vision-and-some\` (`AI-FIRST-PLATFORM-POLICY.md`, `uxaios/`,
`platform-foundation-brainstorm.md`, `pages-to-spaces.md`).

**Why it matters for us.** [04-docs-review-notes](04-docs-review-notes.md) is a *capture* of
these documents, not the documents. Its own opening line says so: "this file is the raw capture,
including things we decided *not* to take and why." Anything not judged worth capturing at the
time is simply not in `companai`. Copying the source set in closes that gap permanently, and it
costs a file copy.

**Verdict: worth harvesting — highest value per unit of effort in this whole document.**
Priority: **high, and cheap.**

---

## 3. Deliberately not worth taking

| Artefact | Size | Why not |
|---|---|---|
| `apps/api` (NestJS layer) | 227 files / 41,776 LOC | Different stack. Open Mercato's module system replaces it. [03 §4.9](03-identity-and-salvage-map.md) already said "Admin workbench screens — wrong product model". |
| `apps/web` (Next.js admin UI) | 243 files / 23,304 LOC | Same. Harvest table/form patterns only, as P1 already advised. |
| `packages/db` | 16 files / 2,288 LOC | Open Mercato owns the schema; the ERP tables are deliberately parked. |
| `ai-governance.ts` | 87 lines | It is a rate limiter with timeout and exponential backoff — **not** a governance layer. Open Mercato already has rate limiting, and Companai already has AI turn/token caps. |
| Demo data (`UXAIOS_DEMO_COMMAND_SPACE_DATASET`, mock embeddings) | — | 6 hardcoded records and `platform.mock-embed-v1`. Scaffolding. |
| `ui-extensions.ts` / `worker-extensions.ts` | 2,149 + 1,750 B | Open Mercato's widget-injection surface is already far larger (`widget.*injection` → 464 files) and it has its own worker system. |
| `transition-runtime.ts` + presets | 4,595 B | Cosmetic motion. Not a differentiator. |
| `debug-certification/`, `STABILIZATION-LOG.md`, `reboot/` | large | Process artefacts from that project's own stabilisation. Read for lessons if wanted; nothing to port. |
| The spatial/3D surface model wholesale | `packages/visualization` 30 files / 1,976 LOC | [04](04-docs-review-notes.md) already declined the UXAIOS spatial UI as "a large, unproven UI research programme". That decision is not disturbed by finding the code. |

---

## 4. What I did not examine

Stated so the gaps are visible rather than assumed away:

- `apps/web` (243 files) — read nothing. Judged out of scope on stack grounds.
- `apps/api` beyond the module list — read nothing.
- `packages/visualization` (30 files) — read nothing beyond the file list.
- `docs/debug.md` (60,458 B), `docs/development-cookbook.md` (68,035 B),
  `docs/STABILIZATION-LOG.md` (73,669 B) — not read.
- The 126 additional test files — used only as evidence that the code is exercised.
- **`E:\brainstorming\projecting\project` is not the only big copy.** `E:\project` (164 files /
  26,698 LOC) and `E:\projecting-main` (135 / 14,062) are smaller and older, and I did not
  examine them at all. If the harvest is pursued, they are worth a check for anything unique.

---

## 5. Recommended action

1. **Copy the documentation set into `companai` now.** `E:\brainstorming\projecting\project\docs\`
   and `formalize-platform-audit\`. Highest value, lowest cost, and it is currently absent from
   the project entirely. Suggested home: `compai/planning/platforms/01-graph-portal-platform/`
   is for *our* assessment documents, so the originals belong in a sibling such as
   `compai/reference/p1-documentation/`.
2. **Write a harvest note for Findings 1–5** — the Knowledge Platform, Beams/Flow Trace, the
   Garage, module-package trust, and the AI dataset contract — each as a short "what it is / what
   we would build / what it replaces" entry, before any code is written. They are design
   contracts, and they belong in `compai/planning/`, not in `starting-kit`.
3. **Leave the spatial/3D surface model alone.** That decision was made deliberately and this
   examination does not disturb it.
4. **Nothing here changes the decision to continue from `starting-kit`.** This copy is a
   *different architecture* at a later stage of its own line, not a newer version of what
   `starting-kit` is. It is a source of designs, not of code.

---

## 6. The one-line summary

The never-assessed copy is **3.2× larger and real, but its value is in its contracts, not its
behaviour** — and the single most valuable thing in it is the documentation set, which is
currently missing from `companai` altogether.
