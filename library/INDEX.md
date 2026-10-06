# The documentation library

**Read [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) first.** It is the product in plain
English, and it is the one page that keeps the eye on the prize. Everything below is detail.

---

## 0. Two kinds of material live here — and they are not equal

This library gathers **our own writing** *and* **other projects' material we studied**. They must
never be read the same way. Keeping them apart is deliberate; mixing them up has already caused real
errors.

### (a) Ours — the direction, the plan, the product

| Folder | Roughly | What it is |
|---|---:|---|
| [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | 1 file | **The product in plain English. Start here.** |
| [`ai/ai-first/`](ai/ai-first/) | 9 files | **THE DIRECTION** — the architecture we are actually building toward. Read [`ai/ai-first/README.md`](ai/ai-first/README.md) first |
| [`development/`](development/) | 21 files | **The live hub** — the one roadmap, the running architecture, the handover, the rules, and the request-outcome taxonomy. Start here to *work* |
| [`analysis/`](analysis/) | ~20 files | Our 12-batch check of the direction against what we already have |
| `01-` … `16-` shelves | ~600 files | Our product documentation: policy, contracts, SRS, audits, certification, blueprints, the shipped product docs |
| [`paperclip-hermes-study/`](paperclip-hermes-study/) · [`paperclip-value-study/`](paperclip-value-study/) | ~24 files | **Our own** studies *of* two other products — the distilled lessons |

### (b) Theirs — imported study material, **evidence only**

| Folder | Roughly | What it is | The rule |
|---|---:|---|---|
| [`ai/`](ai/) (except `ai-first/`) | ~26,000 files | Hermes docs + source, upstream **Paperclip** source, a sibling project's docs | **Lessons and evidence only.** Never a decision we inherit |
| [`ai/source-docs/`](ai/source-docs/) | register + copies | Upstream Paperclip's documentation set | Reference |

> **The rule, in one sentence:** read **our vision** to know what to build; open the **imported
> material** only when a specific feature can learn something from it, and then only as evidence.
> Do not read it "for context" — it is how the direction got buried before. Ours is nine documents;
> the imported pile is tens of thousands of files.

Read [`ai/README.md`](ai/README.md) before using anything in `ai/` — **two different products are
both called Companai**, and one of them is not ours.

---

## 1. Read these first

Five documents. If you read only these, you will understand what the platform is, what we are
building toward, and where it currently stands.

| # | Read | What it gives you |
|---|---|---|
| 1 | [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | **The product in plain English** — the idea, the decisive loop, **the three things a prompt can become**, what we are not, and how to use this library |
| 2 | [`ai/ai-first/README.md`](ai/ai-first/README.md) | **The direction** — the architecture we are actually building toward, and the reading order for the nine vision documents |
| 3 | [`development/HANDOVER.md`](development/HANDOVER.md) | **The handover** — what exists, where it is, the two repositories, the traps, and what is proven vs claimed. **§2 step 1 lays out the three-tier reading order** |
| 4 | [`development/BACKLOG.md`](development/BACKLOG.md) | **The one roadmap** — everything left, in order. The always-current status lives here, not in this index |
| 5 | [`development/ARCHITECTURE-request-outcomes.md`](development/ARCHITECTURE-request-outcomes.md) | **The owner's core features_pack** — a prompt ends as a **one-time answer**, a **model proposal** (new structure), or a **saved Function**; the triage (`G-21`) and the gate on the one that can change the database. Nothing in it is open |
| 6 | [`07-canonical-hardening/OPEN-DECISIONS.md`](07-canonical-hardening/OPEN-DECISIONS.md) | **What is still undecided** — read before assuming anything is settled. Note: the live owner-decision list is [`development/NEEDS-YOU.md`](development/NEEDS-YOU.md) |

Then, if you want the product detail behind the direction: [`01-policy-and-plan/AI-FIRST-PLATFORM-POLICY.md`](01-policy-and-plan/AI-FIRST-PLATFORM-POLICY.md)
(the binding policy), [`05-platform-audit-and-srs/03-srs.md`](05-platform-audit-and-srs/03-srs.md)
(the requirements), and [`07-canonical-hardening/PRODUCT-VISION.md`](07-canonical-hardening/PRODUCT-VISION.md)
(an earlier, interface-centric framing named **UXAIOS** — useful, but it is a facet, not the whole
direction).

---

## 2. Our product shelves

These sixteen folders are **ours** — our product documentation, in reading order. Each one is a
shelf, not a copy — no document appears in two places. (The imported study material — `ai/`,
`ai/source-docs/` — is **not** here; it is covered in §0 and §3, and is evidence only.)

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
| [`ai/paperclip-master/`](ai/paperclip-master/) | **Upstream Paperclip**, extracted from `paperclip-master.zip` — 8,299 files, version `0.3.1` | The subject of the study below. Where its docs disagree with its code, the code wins |
| [`ai/source-docs/`](ai/source-docs/) | The **one place** the scattered source documents were gathered — upstream Paperclip's 317-file doc set — with a register of where every other scattered set lives | Read [`ai/source-docs/README.md`](ai/source-docs/README.md) first. The register is tracked; the copies are not |

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

## 5. The Paperclip + Hermes study — `paperclip-hermes-study/`

**A completed 11-batch forensic study** (2026-10-05) of how AI workers get roles, tasks,
delegation, triggers and conversations — read from Paperclip, Hermes and the sibling's integration,
and turned into lessons for our own agent architecture. **It is our own work, not copied material.**

| File | What it is |
|---|---|
| [`paperclip-hermes-study/findings/10-lessons-and-target-design.md`](paperclip-hermes-study/findings/10-lessons-and-target-design.md) | **Read this first.** The synthesis: every lesson with its evidence and its consequence, the owner's twelve concerns each answered in four voices, and the target design |
| [`paperclip-hermes-study/README.md`](paperclip-hermes-study/README.md) | Why the study exists, the rule that governs it, and the three inputs |
| [`paperclip-hermes-study/PLAN.md`](paperclip-hermes-study/PLAN.md) | The batch plan and results. **Complete: 11 of 11** |
| [`paperclip-hermes-study/LOG.md`](paperclip-hermes-study/LOG.md) | One dated line per batch completed |
| [`paperclip-hermes-study/findings/`](paperclip-hermes-study/findings/) | One findings file per batch, `00`–`10` — 3,931 lines |

**What it hands back.** Lessons, not decisions. **Exactly one decision is left open for the owner** —
whether an assistant agent is *identity* (it belongs to Alice) or *context* (it acts as Alice) — and
it is marked as such in §3.1 of the synthesis.

**The study does not repeat prior work.** Hermes was already forensically analysed twice; the study
**audits** those claims against the source instead (and found one contradicted — "session resume is
broken" is our adapter's defect, not Hermes'). What was genuinely new is **upstream Paperclip**,
which had no analysis anywhere.

### 5b. The value scan — `paperclip-value-study/`

**A second, wider pass over the same upstream product, completed 2026-10-06 at the owner's request.**
The study above answered *"how do AI workers get work?"* This one asks a different question: **what does
Paperclip ship, how does it work, and is any of it worth taking, learning from, or deliberately
rejecting?** Every candidate is cross-checked against five baselines before it is allowed to be called
new — the vision, the Starting Kit's built capabilities, the agent half, the first study's synthesis, and
the backlog. **It documents only where there is value**, which is the owner's instruction and the whole
point of the study.

| File | What it is |
|---|---|
| [`paperclip-value-study/findings/07-synthesis.md`](paperclip-value-study/findings/07-synthesis.md) | **Read this first, and read nothing else unless you want the evidence.** The answer: six things worth acting on, four backlog items confirmed correct, eight rejections with reasons, and the trap list |
| [`paperclip-value-study/PLAN.md`](paperclip-value-study/PLAN.md) | Why the study exists, the rule it runs under, the five baselines, and the twelve batches |
| [`paperclip-value-study/LOG.md`](paperclip-value-study/LOG.md) | One dated line per batch completed, including the extraction verification and the defect it found |
| [`paperclip-value-study/findings/`](paperclip-value-study/findings/) | Six evidence files, `01`–`06`, each naming the batches it covers — plus `07`, the synthesis |

**What it changed.** Four documents, no code: **`ML-4`'s wording** in the backlog (it promised a mid-run
stop we have not built), **four new items on the "do not lose this" list (`N-15` to `N-18`)** — the
orchestration boundary before `AH-3` is built, the self-modification gate, the memory control plane and the
plugin capability model — and **the extraction record** (the archive holds **8,300 files**; one file the
first extraction lost has been restored from the archive, byte-for-byte).

**It also corrected itself, visibly.** The critic pass found two claims in its own findings that were
false ("we have nothing" about the agent-learning prohibition and about memory), and both are corrected
in place with the measurement that disproved them.

---

## 6. The development hub — `development/`

Where the project's own work is managed. **Unlike the sixteen product shelves in §2, these are living
documents we write and update** — not copied sources. **Start here if you are working on the
project.**

| File | What it is |
|---|---|
| [`development/HANDOVER.md`](development/HANDOVER.md) | **The handover — read this first.** What exists, where, the two repositories, the traps nobody can discover, the host VM, the rules, and what is proven vs not. **§0 is written for an agent taking over** |
| [`development/BOOKMARKS.md`](development/BOOKMARKS.md) | **The pages to open first** — the handful of documents that matter, the **end-game / vision** documents, the two integration designs, and an honest list of which folders are in git and which are not |
| [`development/START-PROMPT.md`](development/START-PROMPT.md) | **The message that starts a new session** — paste it to the agent taking over: what to read first, the rules it may not break, and the first task |
| [`development/README.md`](development/README.md) | **The front door.** The reading order, what to study first by role, the handover sequence, and the sprint process |
| [`development/BACKLOG.md`](development/BACKLOG.md) | **The one roadmap.** Everything left, in order, one line each — unifying the Starting Kit work and the product phases. Plus the "do not lose this" list and the deferrals |
| [`development/AGENT-HALF.md`](development/AGENT-HALF.md) | **The agent half** — the five kinds of agent, the responsibility rule, and where every one of the study's 53 lessons lands in the phases |
| [`development/ARCHITECTURE.md`](development/ARCHITECTURE.md) | How the Starting Kit, Hermes and the model server run together, and the dockerisation decision |
| [`development/ARCHITECTURE-hermes-integration.md`](development/ARCHITECTURE-hermes-integration.md) | **The Hermes integration design** — platform to platform, function to function, and multi-tenant, with the owner's **B-05** runtime-boundary decision (§11) |
| [`development/ARCHITECTURE-model-server-integration.md`](development/ARCHITECTURE-model-server-integration.md) | **The model layer** — llama.cpp as one preset entry, the embedding lane, the two defects root-caused, and the owner's **model-default** decision (§9) |
| [`development/BLOCKERS.md`](development/BLOCKERS.md) | Anything stopping progress, with what clears it |
| [`development/NEEDS-YOU.md`](development/NEEDS-YOU.md) | **The owner-only action list** — numbered, with literal steps and a way to answer all of it at once |
| [`development/SPEC-business-model-kernel.md`](development/SPEC-business-model-kernel.md) | The product specification (**Draft 2**, 2026-10-05) — passes the vision's own 40-item gate (35 settled · 1 derived · 3 deferred with triggers · 1 open — owner). Awaiting ratification |
| `development/RUNBOOK-*.md` | The hosting runbooks — the server manual, the domain walkthrough, Sprint 0, and the deployment proof |

**The rule that keeps it clean:** the hub **points at** the other documents, it does not copy
them. `../workspace/COOKBOOK.md` says how the work is done; `../workspace/knowledge/` says how
the platform works; `analysis/` holds the evidence. The hub holds the **plan and the status**.

---

## 7. Relevant, but deliberately not copied

These are already inside `companai` and stay where they are. Copying them would
have created a second version that drifts.

| Where | What it is |
|---|---|
| [`../INDEX.md`](../INDEX.md) | The project's own start page |
| [`../where_we_left.md`](../where_we_left.md) | A status document — **stale.** [`development/BACKLOG.md`](development/BACKLOG.md) is the one plan kept current |
| [`../compai/planning/`](../compai/planning/) | The design: product thesis, core architecture, authority and autonomy, worker charter, context graph, addressing, attribution, host selection, starting kit — plus `platforms/` with the assessments of each candidate platform, including the Graph Portal Platform assessment and the UXAIOS harvest notes |
| [`../compai/brainstorming/`](../compai/brainstorming/) | Where the idea came from |
| [`../workspace/knowledge/`](../workspace/knowledge/) | How the platform actually works — the governance layer, authority, approvals, delegations, denials, record locks, the ledger, the test gate |
| [`../workspace/references/`](../workspace/references/) | The detail behind the cookbook: parked modules, salvage analysis, environment, deployment, how to test |
| [`../workspace/salvage/`](../workspace/salvage/) | One report per module analysed |
| [`../workspace/attic/`](../workspace/attic/) | Rescued code patterns and `CATALOG.md` |
| [`../workspace/starting-kit/`](../workspace/starting-kit/) | The codebase itself, including its own `docs/` from upstream |

---

## 8. What is not in here

Left out on purpose, with the reason:

- **Third-party material.** `E:\brainstorming\projecting\project\supporting platforms to review` holds 1,133 documents (12.6 MB) of other people's documentation. It is reference material about other products, not writing about this one.
- **Raw research sources.** `...\documentation\departments\_source\` holds 336 documents — the raw material the departments synthesis was built from.
- **Superseded copies.** The external drive held several copies of the same documents in different folders. The first copy of each was kept; the rest were removed. The full list is in [`MANIFEST.txt`](MANIFEST.txt).
- **Code, assets and images.** This library is markdown only. The one image referenced by the formalisation set was left behind; the sources are in [`PROVENANCE.md`](PROVENANCE.md) if it is ever needed.
- **Anything not about this platform.** Personal bookmarks, vendored dependencies and build output were skipped.

---

## 9. Keeping this honest

Two files sit alongside this one:

- **[`PROVENANCE.md`](PROVENANCE.md)** — exactly which folder on disk every shelf came from, what was excluded, and how to rebuild the whole library from scratch.
- **[`MANIFEST.txt`](MANIFEST.txt)** — the machine-written record: how many documents were staged, how many duplicates were cut, and the name of every duplicate that was removed.

If a document here is ever found to disagree with the live codebase, **the
codebase wins** and the document needs correcting. Nothing in this library has
been edited — every file is a byte-for-byte copy of where it came from.
