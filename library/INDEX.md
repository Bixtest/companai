# The documentation library

**One place for all the writing behind this project.** The design, the vision, the
audits, the plans and the product documentation — **521 documents across sixteen
shelves**, gathered from wherever they were scattered, with nothing stored twice.
(Add this index, the provenance note and the manifest and the folder holds 524 files.)

The library also now holds everything else we work from, so there is genuinely one
place to look:

- [`ai/`](ai/) — the AI-first direction, the sibling project's Hermes documentation, and the Hermes runtime source. **Read [`ai/README.md`](ai/README.md) first** — two different products are called Companai.
- [`analysis/`](analysis/) — the 12-batch analysis programme that checks AI-FIRST against HERMES and STARTING-KIT.
- [`development/`](development/) — **the development management hub**: the one roadmap, the architecture of the running system, and the handover. Start here if you are working on the project.

Before this, the material lived in about a dozen folders: some inside `companai`,
some only on the external drive (`E:`), some inside the live codebase. If the
external drive was not plugged in, most of the thinking was simply gone.

---

## 1. Read these first

Eight documents. If you read only these, you will understand what the platform is
meant to be and where it currently stands.

| # | Read | What it gives you |
|---|---|---|
| 1 | [`07-canonical-hardening/PRODUCT-VISION.md`](07-canonical-hardening/PRODUCT-VISION.md) | The product in one document. It names the product **UXAIOS**: "a secure, graph-native interface operating layer for complex organizations" — and says what it is *not* |
| 2 | [`01-policy-and-plan/AI-FIRST-PLATFORM-POLICY.md`](01-policy-and-plan/AI-FIRST-PLATFORM-POLICY.md) | The authoritative product and engineering policy. Every module author is bound by it |
| 3 | [`05-platform-audit-and-srs/03-srs.md`](05-platform-audit-and-srs/03-srs.md) | The requirements specification — what the platform must do, and for whom |
| 4 | [`05-platform-audit-and-srs/14-graph-portal-architecture.md`](05-platform-audit-and-srs/14-graph-portal-architecture.md) | The core structural idea: a directed graph of portals, where every relationship carries its own inheritance, delegation, billing and permission rules |
| 5 | [`05-platform-audit-and-srs/15-ai-first-operating-model.md`](05-platform-audit-and-srs/15-ai-first-operating-model.md) | How AI is allowed to work: as a permission-aware layer that can never see or do more than the person asking |
| 6 | [`07-canonical-hardening/PLATFORM-BLUEPRINT.md`](07-canonical-hardening/PLATFORM-BLUEPRINT.md) | The blueprint. It is honest about being a hybrid: intended architecture, current code structure, and only the parts actually verified |
| 7 | [`10-uxaios-interface-vision/01-UXAIOS-VISION-IN-PLAIN-ENGLISH.md`](10-uxaios-interface-vision/01-UXAIOS-VISION-IN-PLAIN-ENGLISH.md) | The interface idea explained with no jargon at all, starting from why today's software makes you click through pages |
| 8 | [`07-canonical-hardening/OPEN-DECISIONS.md`](07-canonical-hardening/OPEN-DECISIONS.md) | **What is still undecided.** Read this before assuming anything is settled |

---

## 2. The shelves

Sixteen folders, in reading order. Each one is a shelf, not a copy — no document
appears in two places.

### The platform we intend to build

| Folder | Docs | What is on it |
|---|---:|---|
| [`01-policy-and-plan/`](01-policy-and-plan/) | 12 | The rules and the plan. The AI-first platform policy, the gap analysis, the implementation plan, the platform dictionary, the stabilisation log, onboarding and engineering standards |
| [`02-architecture-contracts/`](02-architecture-contracts/) | 23 | The contracts that define how parts fit together: knowledge cell, module loader, garage ingredient types, integration extension, theming, UI portability, release gates, plus the architecture decision records in `decisions/` |
| [`03-uxaios-product-and-paths/`](03-uxaios-product-and-paths/) | 25 | The UXAIOS product set. Vision, the six feature-specification batches, the Phase C and Phase D plans, Path 1 milestone and cookbook, performance budgets, demo test guide |
| [`04-agent-analysis/`](04-agent-analysis/) | 42 | What the analysis agents concluded, including the codebase map, the documentation reviews, forensic testing, phase comparisons, and a registry of every issue found |
| [`05-platform-audit-and-srs/`](05-platform-audit-and-srs/) | 49 | **The most substantial set.** A numbered series (01–48) that goes from public context and product map, through the SRS and module specifications, to the target architecture, the AI backbone research, the licensing and reuse strategy, the Plesk deployment feasibility, and the Konsult-related source reviews |
| [`06-certification/`](06-certification/) | 30 | Certification evidence: the bug registry, the gap registry, the framework certification report, and the per-phase results (static, components, API, integration, AI, templates, scenarios, completeness, final) |
| [`07-canonical-hardening/`](07-canonical-hardening/) | 16 | The hardening set: product vision, platform blueprint, capability traceability matrix, defects and technical debt, evidence register, feature status ledger, frontend vision coverage, open decisions, recovery plan |
| [`08-formalize-blueprint/`](08-formalize-blueprint/) | 66 | The platform written out page by page: master index, overview, sitemap, navigation, data model, roles and permissions, shared components, glossary, and a document per page, flow and form |

### Where the idea came from

| Folder | Docs | What is on it |
|---|---:|---|
| [`09-reboot-vision/`](09-reboot-vision/) | 18 | The reboot set: `system_v0/` (vision evolution, master execution pipeline, granular platform topography, SRS master document, backend and UX architect reports) and `boardograpgh/` |
| [`10-uxaios-interface-vision/`](10-uxaios-interface-vision/) | 21 | The interface vision series, 01–15: the 2.5D interface paradigm, spaces and containers, beams and flow grammar, events and zones, the garage and creator ecosystem, and the full platform concept manual |
| [`11-active-workstreams/`](11-active-workstreams/) | 139 | Eight workstreams that were live: database and macro plan, front review, frontend interface reinvention, identity and portal access audit, login tenant flow, page contracts, platform reconstruction, user-centric design |
| [`12-vision-extras/`](12-vision-extras/) | 6 | Vision documents held nowhere else: `pages-to-spaces.md` (the product page tree, mapping every route and control to its function, API and permission gate), the platform foundation brainstorm, the agent immersion brief, the forensic testing framework, an index and a task list |
| [`13-design-conversations/`](13-design-conversations/) | 6 | The exported design conversations with ChatGPT, Claude and Gemini. Raw, unedited — useful for recovering the reasoning behind a decision |
| [`14-reference-collections/`](14-reference-collections/) | 2 | Backend reference notes: the identity and portal access model |
| [`15-agent-rules/`](15-agent-rules/) | 5 | The operating rules for the agents working on the platform |

### The product the live codebase actually ships

| Folder | Docs | What is on it |
|---|---:|---|
| [`16-konsult-product-docs/`](16-konsult-product-docs/) | 61 | The documentation that lives beside the real code: `docs/` (architecture diagnosis, knowledge map, source map, UI/UX vision, whitelabel spec, AI employee lifecycle, engagement and compliance patterns) and `documentation/` (the Claude and Cursor working sets, department-rooms architecture, and the departments series) |

---

## 3. The AI material — read `ai/README.md` first

Two **different products are both called Companai.** One is ours. One is a
Paperclip-based product that already exists. Their documents sit side by side in
`ai/`, and mixing them up produces wrong conclusions. Measured, to make the boundary
provable: `ai-first/` mentions Companai, Paperclip, Aissistant and Open Mercato **zero
times**; `hermes-docs/` mentions them 137, 230, 251 and 8 times.

| Folder / file | What it is | How to read it |
|---|---|---|
| [`ai/ai-first/`](ai/ai-first/) | **THE DIRECTION.** 9 documents, 28,549 lines. A canonical-business-model platform with Hermes as its agent runtime | As requirements on us. This is what we will actually build |
| [`ai/hermes-docs/`](ai/hermes-docs/) | A **sibling project's** documentation — Paperclip-based, also called Companai. 351 files | For **lessons and failure modes only**. Never as decisions we inherit |
| [`ai/hermes-agent-main/`](ai/hermes-agent-main/) | The Hermes agent runtime source itself (Nous Research) | **The artefact.** Where any document disagrees with it, the code wins |
| [`ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`](ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md) · [`ai/qwen-hermes-tool-calling-report.md`](ai/qwen-hermes-tool-calling-report.md) · `ai/tiny_models/` · `ai/integration_research/` | The sibling project's local-model and integration work | Same rule — evidence about tooling, not about our platform |

---

## 4. The analysis — `analysis/`

Where the work of checking AI-FIRST against HERMES and STARTING-KIT happens. It is a
12-batch programme; see [`analysis/PLAN.md`](analysis/PLAN.md).

| File | What it is |
|---|---|
| [`analysis/PLAN.md`](analysis/PLAN.md) | The batch plan, with tickboxes. The live document |
| [`analysis/README.md`](analysis/README.md) | How the programme runs, and the rules it follows |
| [`analysis/LOG.md`](analysis/LOG.md) | One dated line per batch completed |
| [`analysis/findings/`](analysis/findings/) | One report per batch, plus the first-reading notes |

---

## 5. The development hub — `development/`

Where the project's own work is managed. **Unlike the sixteen shelves above, these are living
documents we write and update** — not copied sources. **Start here if you are working on the
project.**

| File | What it is |
|---|---|
| [`development/README.md`](development/README.md) | **The front door.** The reading order, what to study first by role, the handover sequence, and the sprint process |
| [`development/BACKLOG.md`](development/BACKLOG.md) | **The one roadmap.** Everything left, in order, one line each — unifying the Starting Kit work and the product phases. Plus the "do not lose this" list and the deferrals |
| [`development/ARCHITECTURE.md`](development/ARCHITECTURE.md) | How the Starting Kit, Hermes and the model server run together, and the dockerisation decision |
| [`development/BLOCKERS.md`](development/BLOCKERS.md) | Anything stopping progress, with what clears it |

**The rule that keeps it clean:** the hub **points at** the other documents, it does not copy
them. `../workspace/COOKBOOK.md` says how the work is done; `../workspace/knowledge/` says how
the platform works; `analysis/` holds the evidence. The hub holds the **plan and the status**.

---

## 6. Relevant, but deliberately not copied

These are already inside `companai` and stay where they are. Copying them would
have created a second version that drifts.

| Where | What it is |
|---|---|
| [`../INDEX.md`](../INDEX.md) | The project's own start page |
| [`../where_we_left.md`](../where_we_left.md) | The one status document kept current |
| [`../compai/planning/`](../compai/planning/) | The design: product thesis, core architecture, authority and autonomy, worker charter, context graph, addressing, attribution, host selection, starting kit — plus `platforms/` with the assessments of each candidate platform, including the Graph Portal Platform assessment and the UXAIOS harvest notes |
| [`../compai/brainstorming/`](../compai/brainstorming/) | Where the idea came from |
| [`../workspace/knowledge/`](../workspace/knowledge/) | How the platform actually works — the governance layer, authority, approvals, delegations, denials, record locks, the ledger, the test gate |
| [`../workspace/references/`](../workspace/references/) | The detail behind the cookbook: parked modules, salvage analysis, environment, deployment, how to test |
| [`../workspace/salvage/`](../workspace/salvage/) | One report per module analysed |
| [`../workspace/attic/`](../workspace/attic/) | Rescued code patterns and `CATALOG.md` |
| [`../workspace/starting-kit/`](../workspace/starting-kit/) | The codebase itself, including its own `docs/` from upstream |

---

## 7. What is not in here

Left out on purpose, with the reason:

- **Third-party material.** `E:\brainstorming\projecting\project\supporting platforms to review` holds 1,133 documents (12.6 MB) of other people's documentation. It is reference material about other products, not writing about this one.
- **Raw research sources.** `...\documentation\departments\_source\` holds 336 documents — the raw material the departments synthesis was built from.
- **Superseded copies.** The external drive held several copies of the same documents in different folders. The first copy of each was kept; the rest were removed. The full list is in [`MANIFEST.txt`](MANIFEST.txt).
- **Code, assets and images.** This library is markdown only. The one image referenced by the formalisation set was left behind; the sources are in [`PROVENANCE.md`](PROVENANCE.md) if it is ever needed.
- **Anything not about this platform.** Personal bookmarks, vendored dependencies and build output were skipped.

---

## 8. Keeping this honest

Two files sit alongside this one:

- **[`PROVENANCE.md`](PROVENANCE.md)** — exactly which folder on disk every shelf came from, what was excluded, and how to rebuild the whole library from scratch.
- **[`MANIFEST.txt`](MANIFEST.txt)** — the machine-written record: how many documents were staged, how many duplicates were cut, and the name of every duplicate that was removed.

If a document here is ever found to disagree with the live codebase, **the
codebase wins** and the document needs correcting. Nothing in this library has
been edited — every file is a byte-for-byte copy of where it came from.
