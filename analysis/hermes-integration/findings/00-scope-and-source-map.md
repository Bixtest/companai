# Batch 00 — Scope and source map

## Why this is a supplement

The requested source set is large and already has dedicated analysis:

- library/INDEX.md directs readers to the 12-batch first-party analysis and the completed 11-batch Paperclip/Hermes study.
- library/analysis/PLAN.md says the intended target is library/ai/ai-first; the Starting Kit and Hermes are measured from source; sibling documents only help explain Hermes after fact-checking. Findings 09–12 include a 140-requirement overlap map, ownership decisions, shortcut/gap register and development plan.
- library/paperclip-hermes-study/findings/09-aissistant-integration.md studies the sibling integration, including multiple Hermes wiring generations, source-vs-running image divergence, runtime adapter, knowledge sidecar, incidents and unfinished operational proof.
- library/paperclip-hermes-study/findings/10-lessons-and-target-design.md synthesizes Paperclip/Hermes lessons, but its README and the library AI README explicitly say those conclusions are not automatically decisions for the Open Mercato product.
- analysis/hermes-starting-kit-forensic-analysis.md is the previous static comparison. Its process recommendation was made before reading the full product-development hub and is refined in batches 03/04.

## Authority hierarchy

1. Direction: later design-control docs within library/ai/ai-first, as ordered by ai-first/README.md.
2. Current product plan and declared owner choices: library/development, especially SPEC-business-model-kernel.md, AGENT-HALF.md, BACKLOG.md and ARCHITECTURE.md.
3. Implemented Starting Kit behavior: exact local source under workspace/starting-kit; source outranks docs.
4. Hermes behavior: requested local snapshot companai/hermes-agent-main; it has no .git, so exact upstream commit/tag is unknown. Official upstream docs are context only.
5. Sibling Paperclip integration: aissistant-package working tree and records. It is a different product and, at inspection, has 3,766 Git status entries and extensive uncommitted changes. Treat it as a case study, not a released baseline.
6. Prior analyses are useful navigation and hypotheses, not substitutes for current source. The completed study confirms evidence boundaries and identifies contradictions.

## Product-name and boundary trap

The library documents two products called Companai. The target is the Open Mercato-based AI-first business platform in ai-first; aissistant-package is a Paperclip-based AI-company product. Its architecture decisions, single-company assumptions, GRC-specific features, UI and deployment are not our target specification. Reusable evidence concerns patterns and failures: control-plane/runtime seam, orchestration, sessions, approvals, profile isolation, tools, knowledge ingestion, provisioning and deployment.

## Repository state observations and limits

- Starting Kit was at cafe7d6576d0adaa602ce06e0a511e8074e04040 with a clean status at the first inspection. A later check found untracked packages/shared/src/lib/business-widget files and packages/shared/tsconfig.business-widget-tests.json around 19:03–19:06; this analysis did not create or edit them. At final verification during this follow-up, HEAD was fc96340f972f439aba044aa78249afe771d6a3ba (“Widgets: a typed contract, a semantic IR, a registry, and a Function placed in one runs with no AI”) and Git status was clean; the widget files now exist in that committed tree. The intervening commit/status change was external to this analysis.
- Hermes has no .git; git -C resolves to the containing companai repository, not a Hermes revision.
- aissistant-package HEAD was ea24eabf9aa35539d1d91bc82c9706a501394502, with 3,766 modified/untracked status entries. Its host/ is itself a nested repository and also heavily modified. No .env values or secrets were read.
- No source was executed, no tests/builds run, no live services inspected and no performance measured. Sibling deployed behavior was not reproduced.

## What is new here

This work connects prior forensics to the current product architecture and roadmap: it identifies which Starting Kit joints should own each capability, where Paperclip lessons land in the agent-half phases, and where “same-process” / “worker service” needs a precise decision. It is not a fresh re-audit of the 28k-line vision and does not redo source-to-claim tables from the existing study.
